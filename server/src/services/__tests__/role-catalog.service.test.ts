import { ensureCanonicalRoleCatalog } from '../role-catalog.service';

describe('role-catalog.service', () => {
  it('repairs missing canonical roles idempotently', async () => {
    const upsert = jest
      .fn()
      .mockImplementation(async ({ where }: { where: { roleName: string } }) => ({
        roleId: where.roleName.length,
        roleName: where.roleName,
      }));

    const prisma = {
      role: {
        findMany: jest.fn().mockResolvedValue([{ roleName: 'Admin' }, { roleName: 'Customer' }]),
        upsert,
      },
    };

    const result = await ensureCanonicalRoleCatalog(prisma);

    expect(prisma.role.findMany).toHaveBeenCalledWith({
      where: {
        roleName: {
          in: ['Customer', 'Admin', 'Support', 'Super Admin'],
        },
      },
      select: { roleName: true },
    });
    expect(upsert).toHaveBeenCalledTimes(4);
    expect(result.missingRoleNames).toEqual(['Support', 'Super Admin']);
    expect(result.createdCount).toBe(2);
    expect(result.roles.map((role) => role.roleName)).toEqual([
      'Customer',
      'Admin',
      'Support',
      'Super Admin',
    ]);
  });
});
