import { DEFAULT_PERMISSION_CATALOG } from '../shared/default-permissions';

type PermissionCatalogPrisma = {
  permission: {
    findMany: (args: {
      where: { code: { in: string[] } };
      select: { code: true };
    }) => Promise<Array<{ code: string }>>;
    upsert: (args: {
      where: { code: string };
      update: { module: string; description: string };
      create: { code: string; module: string; description: string };
    }) => Promise<{ code: string; module: string; description: string }>;
  };
};

export const ensureDefaultPermissionCatalog = async (prisma: PermissionCatalogPrisma) => {
  const existingPermissions = await prisma.permission.findMany({
    where: { code: { in: DEFAULT_PERMISSION_CATALOG.map((permission) => permission.code) } },
    select: { code: true },
  });

  const existingCodes = new Set(existingPermissions.map((permission) => permission.code));
  const missingPermissionCodes = DEFAULT_PERMISSION_CATALOG
    .map((permission) => permission.code)
    .filter((code) => !existingCodes.has(code));

  const permissions = await Promise.all(
    DEFAULT_PERMISSION_CATALOG.map((permission) =>
      prisma.permission.upsert({
        where: { code: permission.code },
        update: {
          module: permission.module,
          description: permission.description,
        },
        create: permission,
      })),
  );

  return {
    permissions,
    createdCount: missingPermissionCodes.length,
    missingPermissionCodes,
  };
};
