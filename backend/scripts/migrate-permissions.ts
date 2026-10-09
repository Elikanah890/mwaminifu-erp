/* One-off migration: convert legacy employee permission strings to canonical. */
import prisma from '../src/config/database';
import { ALL_PERMISSIONS, LEGACY_PERMISSION_ALIASES } from '../src/config/permissions';

async function main() {
  const canonical = new Set(ALL_PERMISSIONS);
  const employees = await prisma.employee.findMany({ select: { id: true, permissions: true } });
  let changed = 0;

  for (const emp of employees) {
    const current = (emp.permissions as string[]) || [];
    const next = new Set<string>();
    for (const perm of current) {
      if (canonical.has(perm)) {
        next.add(perm);
      } else {
        const aliases = LEGACY_PERMISSION_ALIASES[perm];
        if (aliases) aliases.forEach((a) => next.add(a));
        // unknown/legacy-but-unmapped strings are dropped
      }
    }
    const nextArr = Array.from(next);
    if (nextArr.length !== current.length || nextArr.some((p) => !current.includes(p))) {
      await prisma.employee.update({ where: { id: emp.id }, data: { permissions: nextArr } });
      changed += 1;
    }
  }

  console.log(`Migration complete. Employees updated: ${changed}/${employees.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
