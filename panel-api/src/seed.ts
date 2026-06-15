import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from './db.js';
import { users, PANEL_PERMISSION_KEYS, type PanelPermissions } from './schema.js';
import { hashPassword } from './lib/auth.js';

const SEED_EMAIL = (process.env.SEED_EMAIL || 'mani_golchin@kalku.de').toLowerCase();
const SEED_PASSWORD = process.env.SEED_PASSWORD || 'kalku-' + nanoid(10);
const SEED_NAME = process.env.SEED_NAME || 'Mani Golchin';

export async function ensureSeedUser(): Promise<void> {
  const existing = await db.query.users.findFirst({ where: eq(users.email, SEED_EMAIL) });
  if (existing) {
    console.log(`[seed] user ${SEED_EMAIL} already exists`);
    return;
  }
  const now = new Date();
  await db.insert(users).values({
    id: nanoid(16),
    email: SEED_EMAIL,
    passwordHash: await hashPassword(SEED_PASSWORD),
    name: SEED_NAME,
    // The bootstrap account is the admin that can create + manage all other
    // users. On a fresh DB the CREATE TABLE default is 'user', so set it here.
    role: 'admin',
    companyName: process.env.SEED_COMPANY || '',
    companyLogoUrl: '',
    mustChangePassword: !process.env.SEED_PASSWORD,
    createdAt: now,
    updatedAt: now,
  });
  console.log('━'.repeat(60));
  console.log('[seed] Initial user created:');
  console.log(`  email:    ${SEED_EMAIL}`);
  console.log(`  password: ${SEED_PASSWORD}`);
  if (!process.env.SEED_PASSWORD) {
    console.log('  ⚠ This is a generated password — change it on first login.');
  }
  console.log('━'.repeat(60));
}

/** Internal team members provisioned alongside the bootstrap admin. Each is a
 *  regular `user` (not admin) granted every panel feature; an admin can narrow
 *  access or promote them in the Benutzer tab. Email/password are overridable
 *  via env so a known initial password can be handed out instead of reading it
 *  from the boot log. */
const TEAM_MEMBERS: ReadonlyArray<{ email: string; name: string; passwordEnv: string }> = [
  { email: (process.env.SACHA_EMAIL || 'sacha@kalku.de').toLowerCase(), name: 'Sacha', passwordEnv: 'SACHA_PASSWORD' },
  {
    email: (process.env.VANESSA_EMAIL || 'vanessa@kalku.de').toLowerCase(),
    name: 'Vanessa',
    passwordEnv: 'VANESSA_PASSWORD',
  },
];

const FULL_PANEL_ACCESS: PanelPermissions = PANEL_PERMISSION_KEYS.reduce<PanelPermissions>(
  (acc, key) => ({ ...acc, [key]: true }),
  {},
);

export async function ensureTeamUsers(): Promise<void> {
  for (const member of TEAM_MEMBERS) {
    const existing = await db.query.users.findFirst({ where: eq(users.email, member.email) });
    if (existing) {
      console.log(`[seed] team user ${member.email} already exists`);
      continue;
    }
    const envPassword = process.env[member.passwordEnv];
    const password = envPassword || 'kalku-' + nanoid(12);
    const now = new Date();
    await db.insert(users).values({
      id: nanoid(16),
      email: member.email,
      passwordHash: await hashPassword(password),
      name: member.name,
      role: 'user',
      isActive: true,
      permissions: FULL_PANEL_ACCESS,
      companyName: process.env.SEED_COMPANY || '',
      companyLogoUrl: '',
      // Always force a change on first login — the same gate admin-created
      // accounts hit (see routes/admin.ts).
      mustChangePassword: true,
      createdAt: now,
      updatedAt: now,
    });
    console.log('━'.repeat(60));
    console.log(`[seed] Team user created: ${member.name}`);
    console.log(`  email:    ${member.email}`);
    console.log(`  password: ${password}`);
    console.log('  ⚠ Must be changed on first login.');
    if (!envPassword) console.log(`  (generated — set ${member.passwordEnv} to choose one)`);
    console.log('━'.repeat(60));
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    // Ensure the schema exists before inserting the seed user. Idempotent —
    // safe to call on an already-migrated DB. Added for the Round 3 e2e
    // setup where Playwright runs `seed` before `dev`, and only `dev`'s
    // bootstrap was previously calling runMigrations.
    const { runMigrations } = await import('./db.js');
    runMigrations();
    await ensureSeedUser();
    await ensureTeamUsers();
  })().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
