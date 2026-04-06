import { ensureDefaultPermissionCatalog } from '../permission-catalog.service';

describe('ensureDefaultPermissionCatalog', () => {
  it('idempotently repairs missing permission rows including returns permissions', async () => {
    const findMany = jest.fn().mockResolvedValue([{ code: 'VIEW_PRODUCT' }]);
    const upsert = jest.fn().mockImplementation(async ({ create }) => create);

    const prisma = {
      permission: {
        findMany,
        upsert,
      },
    };

    const result = await ensureDefaultPermissionCatalog(prisma);

    expect(findMany).toHaveBeenCalledWith({
      where: {
        code: {
          in: expect.arrayContaining(['VIEW_RETURNS', 'MANAGE_RETURNS']),
        },
      },
      select: { code: true },
    });
    expect(upsert).toHaveBeenCalledWith({
      where: { code: 'VIEW_RETURNS' },
      update: {
        module: 'RETURNS',
        description: 'Xem danh sách và chi tiết yêu cầu hoàn trả',
      },
      create: {
        code: 'VIEW_RETURNS',
        module: 'RETURNS',
        description: 'Xem danh sách và chi tiết yêu cầu hoàn trả',
      },
    });
    expect(upsert).toHaveBeenCalledWith({
      where: { code: 'MANAGE_RETURNS' },
      update: {
        module: 'RETURNS',
        description: 'Xử lý các bước vận hành của quy trình hoàn trả',
      },
      create: {
        code: 'MANAGE_RETURNS',
        module: 'RETURNS',
        description: 'Xử lý các bước vận hành của quy trình hoàn trả',
      },
    });
    expect(result.createdCount).toBeGreaterThan(0);
    expect(result.missingPermissionCodes).toEqual(
      expect.arrayContaining(['VIEW_RETURNS', 'MANAGE_RETURNS']),
    );
  });
});
