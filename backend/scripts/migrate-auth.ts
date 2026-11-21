/**
 * Step 2 — migrate every account to Email + Password.
 *
 * Safe/idempotent: only writes email/passwordHash fields. No records are deleted.
 * Run with: npx tsx scripts/migrate-auth.ts
 */
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/bcrypt.util';

const prisma = new PrismaClient();

type Mapping = {
  match: (u: { username: string | null; phone: string | null; name: string; role: string }) => boolean;
  email: string;
  password: string;
};

const SYSTEM_EMAIL_DOMAIN = 'mwaminifu.co.tz';

const MAPPINGS: Mapping[] = [
  { match: (u) => u.role === 'SYSTEM_OWNER', email: `admin@${SYSTEM_EMAIL_DOMAIN}`, password: 'admin123' },
  { match: (u) => u.username === 'agent1', email: `agent1@${SYSTEM_EMAIL_DOMAIN}`, password: 'agent123' },
  // Active agent keeps the existing contact email per the agreed decision.
  { match: (u) => u.username === 'agent275', email: 'elkanahbaha@gmail.com', password: 'agent123' },
  { match: (u) => u.phone === '0754000000' || u.name === 'John Business', email: `john@${SYSTEM_EMAIL_DOMAIN}`, password: 'owner123' },
  { match: (u) => u.phone === '0784004689', email: `owner.elkanah.1@${SYSTEM_EMAIL_DOMAIN}`, password: 'owner123' },
  { match: (u) => u.phone === '0784004690', email: `owner.elkanah.2@${SYSTEM_EMAIL_DOMAIN}`, password: 'owner123' },
  { match: (u) => u.phone === '255799000111', email: `throwaway.owner@${SYSTEM_EMAIL_DOMAIN}`, password: 'owner123' },
  { match: (u) => u.phone === '0754111111' || u.name === 'Mary Cashier', email: `mary@${SYSTEM_EMAIL_DOMAIN}`, password: 'employee123' },
  { match: (u) => u.phone === '255712345692', email: `peter@${SYSTEM_EMAIL_DOMAIN}`, password: 'employee123' },
  { match: (u) => u.phone === '255712345693', email: `anna@${SYSTEM_EMAIL_DOMAIN}`, password: 'employee123' },
];

function normalized(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase();
}

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, phone: true, name: true, role: true, email: true, passwordHash: true },
    orderBy: { createdAt: 'asc' },
  });

  const used = new Set<string>();
  const results: Array<{ id: string; name: string; role: string; email: string; password?: string }> = [];

  for (const user of users) {
    const mapping = MAPPINGS.find((m) => m.match(user));

    let email = normalized(mapping?.email ?? user.email);
    if (!email || used.has(email)) {
      const base = user.role.toLowerCase().replace(/_/g, '.');
      const suffix = user.username || user.phone || user.id;
      email = `${base}.${suffix}@${SYSTEM_EMAIL_DOMAIN}`.replace(/\s+/g, '');
    }
    // Final collision guard (deterministic per user id).
    if (used.has(email)) email = `${email.split('@')[0]}.${user.id}@${SYSTEM_EMAIL_DOMAIN}`;
    used.add(email);

    let password: string | undefined = mapping?.password;
    let passwordHash = user.passwordHash;
    if (!passwordHash) {
      password = password || 'mwaminifu123';
      passwordHash = await hashPassword(password);
    } else if (password) {
      // Re-set known credentials so the migrated accounts are predictable.
      passwordHash = await hashPassword(password);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        email,
        passwordHash: passwordHash!,
        // Existing accounts keep their known password; only brand-new/unknown
        // accounts must choose a new one on first login.
        mustChangePassword: Boolean(!user.passwordHash && !mapping && password),
        // Agent One was disabled in the old demo data, but it is one of the
        // required verification accounts for the new email login.
        ...(user.username === 'agent1' ? { isActive: true, deletedAt: null } : {}),
      },
    });

    if (user.role === 'AGENT') {
      await prisma.agent.updateMany({
        where: { username: user.username ?? undefined },
        data: {
          email,
          passwordHash: passwordHash!,
          ...(user.username === 'agent1' ? { isActive: true, deletedAt: null } : {}),
        },
      });
    }

    results.push({
      id: user.id,
      name: user.name,
      role: user.role,
      email,
      ...(password ? { password } : {}),
    });
  }

  console.log('\nMigrated accounts:');
  for (const r of results) {
    console.log(`- ${r.role.padEnd(15)} ${r.email.padEnd(42)} ${r.password ?? '(existing password kept)'}`);
  }

  const verification = await prisma.user.findMany({
    select: { email: true, passwordHash: true },
  });
  const missing = verification.filter((u) => !u.email || !u.passwordHash);
  const emails = verification.map((u) => normalized(u.email));
  const duplicateEmails = emails.filter((email, i) => emails.indexOf(email) !== i);

  console.log(`\nUsers: ${verification.length}, missing email/password: ${missing.length}, duplicate emails: ${duplicateEmails.length}`);
  if (missing.length || duplicateEmails.length) {
    throw new Error('Migration verification failed: all users must have a unique email and password hash.');
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
