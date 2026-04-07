import { analyzeCode } from '../claude';
import { searchCodeFiles, getRecentChanges, SIMULATED_GIT_LOG } from '../medusa-code';
import { startTrace, endTrace } from '../traces';
import { logAgentStart, logAgentEnd } from '../logger';
import { recordAgentDuration } from '../metrics';

export interface CodeAnalysisInput {
  incidentId: number;
  description: string;
  component?: string;
  type?: string;
}

export interface CodeAnalysisResult {
  files_found: string[];
  recent_changes: Array<{
    path: string;
    lastModified: string;
  }>;
  relevant_code_snippets: Array<{
    file: string;
    snippet: string;
    concern: string;
  }>;
  analysis: string;
  root_cause_likelihood: string;
}

export async function runCodeAnalystAgent(input: CodeAnalysisInput): Promise<CodeAnalysisResult> {
  logAgentStart(input.incidentId, 'code-analyst');
  const agentStart = performance.now();
  const traceKey = startTrace(input.incidentId, 'code-analyst', `Component: ${input.component || 'all'}`);

  try {
    // Search for relevant code files
    const searchQuery = [input.description, input.component, input.type].filter(Boolean).join(' ');
    const relevantFiles = searchCodeFiles(searchQuery);

    // Get recently changed files (last 48 hours)
    const recentChanges = getRecentChanges(48);

    // Prepare code snippets for analysis
    const codeSnippets = relevantFiles.slice(0, 5).map(f =>
      `// File: ${f.path}\n// Last modified: ${f.lastModified}\n${f.content}`
    );

    // Call Claude to analyze code
    const analysis = await analyzeCode({
      incident_description: input.description,
      code_snippets: codeSnippets,
      git_log: SIMULATED_GIT_LOG,
    });

    // Extract code snippets with concerns (look for BUG/WARNING/TODO comments)
    const snippetsWithConcerns = relevantFiles.flatMap(f => {
      const lines = f.content.split('\n');
      const concerns: Array<{ file: string; snippet: string; concern: string }> = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (
          line.includes('BUG:') || line.includes('WARNING:') || line.includes('TODO:') ||
          line.includes('FIXME:') || line.includes('HACK:') || line.includes('XXX:') ||
          line.includes('NOTE:') || line.includes('@ts-ignore') ||
          line.match(/catch\s*\{/) || line.match(/catch\s*\(\s*\)\s*\{/) ||
          line.includes('as any') || line.includes(': any') ||
          line.includes('process.exit')
        ) {
          const start = Math.max(0, i - 2);
          const end = Math.min(lines.length, i + 3);
          concerns.push({
            file: f.path,
            snippet: lines.slice(start, end).join('\n'),
            concern: line.trim().replace(/\/\/\s*/, ''),
          });
        }
      }
      return concerns;
    });

    const result: CodeAnalysisResult = {
      files_found: relevantFiles.map(f => f.path),
      recent_changes: recentChanges.map(f => ({ path: f.path, lastModified: f.lastModified })),
      relevant_code_snippets: snippetsWithConcerns.slice(0, 10),
      analysis: typeof analysis?.analysis === 'string' ? analysis.analysis : 'Code analysis inconclusive',
      root_cause_likelihood: typeof analysis?.root_cause_likelihood === 'string' ? analysis.root_cause_likelihood : 'medium',
    };

    endTrace(traceKey, `Found ${result.files_found.length} files, ${result.relevant_code_snippets.length} concerns, likelihood: ${result.root_cause_likelihood}`);
    const dur = performance.now() - agentStart;
    logAgentEnd(input.incidentId, 'code-analyst', dur, `${result.files_found.length} files found`);
    recordAgentDuration('code-analyst', dur);
    return result;
  } catch (error) {
    endTrace(traceKey, `Error: ${error instanceof Error ? error.message : 'Unknown'}`);
    throw error;
  }
}
