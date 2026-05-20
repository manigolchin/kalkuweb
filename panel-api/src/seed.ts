import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from './db.js';
import { users } from './schema.js';
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

if (import.meta.url === `file://${process.argv[1]}`) {
  ensureSeedUser().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
