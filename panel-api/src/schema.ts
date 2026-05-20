import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  companyName: text('company_name').notNull().default(''),
  companyLogoUrl: text('company_logo_url').notNull().default(''),
  mustChangePassword: integer('must_change_password', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull().references(() => users.id),
  data: text('data', { mode: 'json' }).notNull().$type<ProjectData>(),
  versionNumber: integer('version_number').notNull().default(1),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const shares = sqliteTable('shares', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  visiblePositionIds: text('visible_position_ids', { mode: 'json' }).notNull().$type<string[]>(),
  settings: text('settings', { mode: 'json' }).notNull().$type<ShareSettings>(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  revokedAt: integer('revoked_at', { mode: 'timestamp_ms' }),
  lastViewedAt: integer('last_viewed_at', { mode: 'timestamp_ms' }),
  viewCount: integer('view_count').notNull().default(0),
});

export const shareResponses = sqliteTable('share_responses', {
  id: text('id').primaryKey(),
  shareId: text('share_id').notNull().references(() => shares.id, { onDelete: 'cascade' }),
  responseType: text('response_type', { enum: ['approve', 'changes', 'reject'] }).notNull(),
  customerName: text('customer_name'),
  customerEmail: text('customer_email'),
  ip: text('ip'),
  userAgent: text('user_agent'),
  payload: text('payload', { mode: 'json' }).notNull().$type<ResponsePayload>(),
  respondedAt: integer('responded_at', { mode: 'timestamp_ms' }).notNull(),
});

export type User = typeof users.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Share = typeof shares.$inferSelect;
export type ShareResponse = typeof shareResponses.$inferSelect;

export type Position = {
  id: string;
  oz: string;
  shortText: string;
  longText: string;
  hinweisText: string;
  quantity: number;
  unit: string;
  materialCost: number;
  timeMinutes: number;
  nuCost: number;
  isHeader: boolean;
  sortOrder: number;
  sectionPath: string;
  epLohn: number;
  epMaterial: number;
  epGeraet: number;
  epNu: number;
  ep: number;
  gp: number;
  classification?: string | null;
  visibleToCustomer: boolean;
  internalNote?: string;
};

export type CalcParams = {
  mittellohn: number;
  verrechnungslohn: number;
  materialZuschlag: number;
  nuZuschlag: number;
  geraeteZuschlagPct: number;
  geraeteStundensatz: number;
  zeitabzug: number;
  tagesstunden: number;
  personaleinsatz: number;
  mwst: number;
};

export type ProjectData = {
  name: string;
  client: string;
  clientEmail?: string;
  clientAddress?: string;
  service: string;
  tenderNumber: string;
  deadline: string;
  bidder: string;
  calcParams: CalcParams;
  positions: Position[];
  notes?: string;
};

export type ShareSettings = {
  brandHeader: 'own' | 'co-branded' | 'minimal';
  customerName?: string;
  customerEmail?: string;
  message?: string;
  allowApproval: boolean;
  allowChangeRequests: boolean;
  showTotals: boolean;
  showMwst: boolean;
};

export type ResponsePayload = {
  message?: string;
  changes?: Array<{
    positionId: string;
    type: 'modify' | 'remove' | 'comment';
    text: string;
  }>;
  signature?: {
    name: string;
    timestamp: number;
    ip: string;
  };
};
