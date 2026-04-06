import 'dotenv/config';
import { PrismaClient } from '../generated/client';
import { ensureDefaultPermissionCatalog } from '../services/permission-catalog.service';

const prisma = new PrismaClient();

async function main() {
  const result = await ensureDefaultPermissionCatalog(prisma);

  console.log(
    JSON.stringify(
      {
        success: true,
        createdCount: result.createdCount,
        missingPermissionCodes: result.missingPermissionCodes,
        permissionCodes: result.permissions.map((permission) => permission.code),
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
