import { prisma } from '../../lib/prisma';
import type { Prisma } from '../../generated/client';

// ─── Utility: Vietnamese slug ─────────────────────────────────────────────────

const VI_MAP: Record<string, string> = {
    à: 'a', á: 'a', â: 'a', ã: 'a', ả: 'a', ạ: 'a', ă: 'a', ắ: 'a', ặ: 'a', ằ: 'a', ẳ: 'a', ẵ: 'a',
    ấ: 'a', ầ: 'a', ẩ: 'a', ẫ: 'a', ậ: 'a', è: 'e', é: 'e', ê: 'e', ẽ: 'e', ẻ: 'e', ẹ: 'e',
    ế: 'e', ề: 'e', ể: 'e', ễ: 'e', ệ: 'e', ì: 'i', í: 'i', ĩ: 'i', ỉ: 'i', ị: 'i',
    ò: 'o', ó: 'o', ô: 'o', õ: 'o', ỏ: 'o', ọ: 'o', ố: 'o', ồ: 'o', ổ: 'o', ỗ: 'o', ộ: 'o',
    ơ: 'o', ớ: 'o', ờ: 'o', ở: 'o', ỡ: 'o', ợ: 'o', ù: 'u', ú: 'u', û: 'u', ũ: 'u', ủ: 'u', ụ: 'u',
    ư: 'u', ứ: 'u', ừ: 'u', ử: 'u', ữ: 'u', ự: 'u', ỳ: 'y', ý: 'y', ỹ: 'y', ỷ: 'y', ỵ: 'y', đ: 'd',
    // uppercase handled by toLowerCase() first
};

export function generateCategorySlug(name: string): string {
    return name
        .split('')
        .map((c) => VI_MAP[c.toLowerCase()] ?? c.toLowerCase())
        .join('')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

// ─── Repository ───────────────────────────────────────────────────────────────

export const categoryRepository = {
    async findAll() {
        return (prisma.category as any).findMany({
            select: {
                categoryId: true, parentId: true, name: true, slug: true,
                description: true, imageUrl: true,
                _count: { select: { products: true } },
            },
            orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
        });
    },

    async findById(id: number) {
        return (prisma.category as any).findUnique({
            where: { categoryId: id },
            select: {
                categoryId: true, imageUrl: true,
                _count: { select: { children: true, products: true } },
            },
        });
    },

    async create(data: Prisma.CategoryCreateInput) {
        return (prisma.category as any).create({ data });
    },

    async update(id: number, data: Prisma.CategoryUpdateInput) {
        return (prisma.category as any).update({ where: { categoryId: id }, data });
    },

    async delete(id: number) {
        return prisma.category.delete({ where: { categoryId: id } });
    },

    async findAllFlat() {
        return (prisma.category as any).findMany({
            select: { categoryId: true, parentId: true, name: true, slug: true },
            orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
        });
    },

    /** All cat ids/parentIds for circular-check */
    async findAllRelations() {
        return prisma.category.findMany({ select: { categoryId: true, parentId: true } });
    },
};
