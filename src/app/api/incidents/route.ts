import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { incidents } from '@/lib/schema';
import { runPipeline } from '@/lib/pipeline';
import { validateAndSanitize } from '@/lib/guardrails';
import { desc } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    let title: string;
    let description: string;
    let reporterEmail: string | null = null;
    let imageFile: File | null = null;

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await request.json();
      title = body.title;
      description = body.description;
      reporterEmail = body.reporter_email || null;
    } else {
      const formData = await request.formData();
      title = formData.get('title') as string;
      description = formData.get('description') as string;
      reporterEmail = formData.get('reporter_email') as string | null;
      imageFile = formData.get('image') as File | null;
    }

    if (!title || !description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
    }

    // Sanitize inputs
    const titleCheck = validateAndSanitize(title);
    const descCheck = validateAndSanitize(description);

    if (titleCheck.warnings.length > 0 || descCheck.warnings.length > 0) {
      console.warn('Input sanitization warnings:', [...titleCheck.warnings, ...descCheck.warnings]);
    }

    // Handle image upload
    let imagePath: string | null = null;
    let imageBase64: string | undefined;
    let imageMimeType: string | undefined;

    if (imageFile && imageFile.size > 0) {
      const bytes = await imageFile.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Save to uploads directory
      const uploadDir = process.env.NODE_ENV === 'production' ? '/app/uploads' : path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const fileName = `${Date.now()}-${imageFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      imagePath = path.join(uploadDir, fileName);
      fs.writeFileSync(imagePath, buffer);

      imageBase64 = buffer.toString('base64');
      imageMimeType = imageFile.type;
    }

    // Create incident record
    const incident = db.insert(incidents).values({
      title: titleCheck.sanitized,
      description: descCheck.sanitized,
      status: 'open',
      reporter_email: reporterEmail || null,
      image_path: imagePath,
    }).returning().get();

    // Run the full agent pipeline
    const result = await runPipeline({
      incidentId: incident.id,
      title: titleCheck.sanitized,
      description: descCheck.sanitized,
      reporterEmail: reporterEmail || undefined,
      imageBase64,
      imageMimeType,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Pipeline error:', error);
    return NextResponse.json(
      { error: 'Failed to process incident', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const allIncidents = db.select().from(incidents).orderBy(desc(incidents.created_at)).all();
    return NextResponse.json(allIncidents);
  } catch (error) {
    console.error('Failed to list incidents:', error);
    return NextResponse.json({ error: 'Failed to list incidents' }, { status: 500 });
  }
}
