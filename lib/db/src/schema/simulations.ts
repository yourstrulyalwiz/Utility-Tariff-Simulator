import { pgTable, text, integer, boolean, jsonb, timestamp, numeric, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const simulationsTable = pgTable("simulations", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id"),
  name: text("name").notNull(),
  utility: text("utility").notNull(),
  startYear: integer("start_year").notNull(),
  endYear: integer("end_year").notNull(),
  currency: text("currency").notNull().default("PHP"),
  version: integer("version").notNull().default(1),
  readOnly: boolean("read_only").notNull().default(false),
  inputs: jsonb("inputs").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("simulations_owner_idx").on(t.ownerId)]);
export const insertSimulationSchema = createInsertSchema(simulationsTable);

export const revisionsTable = pgTable("simulation_revisions", {
  id: text("id").primaryKey(),
  simulationId: text("simulation_id").notNull().references(() => simulationsTable.id),
  version: integer("version").notNull(),
  snapshot: jsonb("snapshot").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const runsTable = pgTable("calculation_runs", {
  id: text("id").primaryKey(),
  simulationId: text("simulation_id").notNull().references(() => simulationsTable.id),
  inputVersion: integer("input_version").notNull(),
  inputHash: text("input_hash").notNull(),
  engineVersion: text("engine_version").notNull(),
  result: jsonb("result").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const reportsTable = pgTable("report_versions", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull().references(() => runsTable.id),
  version: integer("version").notNull(),
  snapshot: jsonb("snapshot").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const observationsTable = pgTable("observations", {
  id: text("id").primaryKey(),
  simulationId: text("simulation_id").notNull().references(() => simulationsTable.id),
  revision: integer("revision").notNull(),
  metric: text("metric").notNull(),
  value: numeric("value"),
  unit: text("unit").notNull(),
  periodStart: text("period_start").notNull(),
  periodEnd: text("period_end").notNull(),
  scope: text("scope").notNull(),
  quality: text("quality").notNull(),
  source: text("source").notNull(),
});
export const projectsTable = pgTable("investment_projects", {
  id: text("id").primaryKey(),
  simulationId: text("simulation_id").notNull().references(() => simulationsTable.id),
  revision: integer("revision").notNull(),
  projectKey: text("project_key").notNull(),
  name: text("name").notNull(),
  year: integer("year").notNull(),
  amount: numeric("amount").notNull(),
  grantPercent: numeric("grant_percent").notNull(),
  equityPercent: numeric("equity_percent").notNull(),
  financing: jsonb("financing").notNull(),
});
export const evidenceTable = pgTable("evidence_documents", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  simulationId: text("simulation_id").notNull().references(() => simulationsTable.id),
  name: text("name").notNull(),
  size: integer("size").notNull(),
  contentType: text("content_type").notNull(),
  objectPath: text("object_path").notNull(),
  locator: text("locator").notNull().default(""),
  confirmed: boolean("confirmed").notNull().default(false),
  checksum: text("checksum"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
