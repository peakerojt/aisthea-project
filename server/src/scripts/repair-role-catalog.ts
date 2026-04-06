import 'dotenv/config';
import { PrismaClient } from '../generated/client';
import { ensureCanonicalRoleCatalog } from '../services/role-catalog.service';

const prisma = new PrismaClient();

async function main() {
  const result = await ensureCanonicalRoleCatalog(prisma);

  console.log(
    JSON.stringify(
      {
        success: true,
        createdCount: result.createdCount,
        missingRoleNames: result.missingRoleNames,
        roleNames: result.roles.map((role) => role.roleName),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
