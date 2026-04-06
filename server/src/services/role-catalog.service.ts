import { CANONICAL_ROLE_CATALOG } from '../shared/role-catalog';

type RoleRecord = {
  roleId: number;
  roleName: string;
};

type RoleCatalogPrisma = {
  role: {
    findMany: (args: {
      where: { roleName: { in: string[] } };
      select: { roleName: true };
    }) => Promise<Array<{ roleName: string }>>;
    upsert: (args: {
      where: { roleName: string };
      update: Record<string, never>;
      create: { roleName: string };
    }) => Promise<RoleRecord>;
  };
};

export const ensureCanonicalRoleCatalog = async (prisma: RoleCatalogPrisma) => {
  const existingRoles = await prisma.role.findMany({
    where: { roleName: { in: [...CANONICAL_ROLE_CATALOG] } },
    select: { roleName: true },
  });

  const existingRoleNames = new Set(existingRoles.map((role) => role.roleName));
  const missingRoleNames = CANONICAL_ROLE_CATALOG.filter((roleName) => !existingRoleNames.has(roleName));

  const roles = await Promise.all(
    CANONICAL_ROLE_CATALOG.map((roleName) =>
      prisma.role.upsert({
        where: { roleName },
        update: {},
        create: { roleName },
      }),
    ),
  );

  return {
    roles,
    missingRoleNames,
    createdCount: missingRoleNames.length,
  };
};
