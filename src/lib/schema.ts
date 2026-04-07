import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const incidents = sqliteTable('incidents', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  description: text('description').notNull(),
  severity: text('severity', { enum: ['critical', 'high', 'medium', 'low'] }),
  component: text('component'),
  type: text('type'),
  image_path: text('image_path'),
  status: text('status', { enum: ['open', 'triaged', 'investigating', 'resolved'] }).default('open').notNull(),
  reporter_email: text('reporter_email'),
  created_at: text('created_at').default(sql`(datetime('now'))`).notNull(),
});

export const tickets = sqliteTable('tickets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  incident_id: integer('incident_id').notNull().references(() => incidents.id),
  team: text('team').notNull(),
  summary: text('summary').notNull(),
  hypothesis: text('hypothesis'),
  suggested_fix: text('suggested_fix'),
  status: text('status', { enum: ['open', 'in_progress', 'resolved', 'closed'] }).default('open').notNull(),
  assigned_to: text('assigned_to'),
  created_at: text('created_at').default(sql`(datetime('now'))`).notNull(),
});

export const traces = sqliteTable('traces', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  incident_id: integer('incident_id').notNull().references(() => incidents.id),
  agent_name: text('agent_name').notNull(),
  input_summary: text('input_summary'),
  output_summary: text('output_summary'),
  duration_ms: real('duration_ms'),
  created_at: text('created_at').default(sql`(datetime('now'))`).notNull(),
});

export const notifications = sqliteTable('notifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  incident_id: integer('incident_id').notNull().references(() => incidents.id),
  type: text('type').notNull(),
  recipient: text('recipient').notNull(),
  message: text('message').notNull(),
  sent_at: text('sent_at').default(sql`(datetime('now'))`).notNull(),
});

export type Incident = typeof incidents.$inferSelect;
export type NewIncident = typeof incidents.$inferInsert;
export type Ticket = typeof tickets.$inferSelect;
export type Trace = typeof traces.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
