
import { mysqlTable, varchar, text, json, timestamp } from 'drizzle-orm/mysql-core';

export const scans = mysqlTable('scans', {
  id: varchar('id', { length: 191 }).primaryKey(),
  target: text('target').notNull(),
  status: varchar('status', { length: 50 }).notNull(),
  startTime: varchar('start_time', { length: 50 }).notNull(),
  endTime: varchar('end_time', { length: 50 }),
  findings: json('findings').$type<any[]>().default([]),
  events: json('events').$type<any[]>().default([]),
  stats: json('stats').$type<any>(),
  compliance: json('compliance').$type<any[]>(),
  activeRulePackIds: json('active_rule_pack_ids').$type<string[]>(),
  benchmark: json('benchmark').$type<any>(),
  insights: json('insights').$type<any>(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const proxyLogs = mysqlTable('proxy_logs', {
  id: varchar('id', { length: 191 }).primaryKey(),
  scanId: varchar('scan_id', { length: 191 }).notNull(),
  proxy: varchar('proxy', { length: 255 }).notNull(), // Redacted for security
  target: text('target').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
