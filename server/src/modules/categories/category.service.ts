import { categoryRepository, generateCategorySlug } from './category.repository';
import { cloudinaryService } from '../../services/cloudinary.service';
import { AppError } from '../../middlewares/error.middleware';

// ─── Tree builder (O(n)) ──────────────────────────────────────────────────────

interface CategoryRaw {
    categoryId: number;
    parentId: number | null;
    name: string;
    slug: string;
    description: string | null;
    imageUrl: string | null;
    _count: { products: number };
}

interface CategoryNode extends CategoryRaw {
    children: CategoryNode[];
}

function buildTree(flat: CategoryRaw[]): CategoryNode[] {
    const map = new Map<number, CategoryNode>();
    const roots: CategoryNode[] = [];
    for (const cat of flat) map.set(cat.categoryId, { ...cat, children: [] });
    for (const node of map.values()) {
        if (node.parentId !== null && map.has(node.parentId)) {
            map.get(node.parentId)!.children.push(node);
        } else {
            roots.push(node);
        }
    }
    return roots;
}

async function isCircularParent(categoryId: number, proposedParentId: number): Promise<boolean> {
    if (proposedParentId === categoryId) return true;
    const all = await categoryRepository.findAllRelations();
    const childMap = new Map<number, number[]>();
    for (const c of all) {
        if (c.parentId !== null) {
            if (!childMap.has(c.parentId)) childMap.set(c.parentId, []);
            childMap.get(c.parentId)!.push(c.categoryId);
        }
    }
    const stack = [categoryId];
    while (stack.length > 0) {
        const current = stack.pop()!;
        for (const child of childMap.get(current) ?? []) {
            if (child === proposedParentId) return true;
            stack.push(child);
        }
    }
    return false;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const categoryService = {
    async getTree() {
        const flat = await categoryRepository.findAll();
        return buildTree(flat);
    },

    async getFlat() {
        return categoryRepository.findAllFlat();
    },

    async create(data: { name: string; parentId?: number | null; description?: string; imageUrl?: string }) {
        const slug = generateCategorySlug(data.name.trim());
        return categoryRepository.create({
            name: data.name.trim(),
            slug,
            description: data.description ?? null,
            parentId: data.parentId ? Number(data.parentId) : null,
            imageUrl: data.imageUrl ?? null,
        } as any);
    },

    async update(id: number, data: { name: string; parentId?: number | null; description?: string; imageUrl?: string }) {
        if (data.parentId !== null && data.parentId !== undefined) {
            const circular = await isCircularParent(id, Number(data.parentId));
            if (circular) {
                throw new AppError(400, 'CIRCULAR_PARENT', 'categories:errors.circularParent');
            }
        }
        const slug = generateCategorySlug(data.name.trim());
        return categoryRepository.update(id, {
            name: data.name.trim(),
            slug,
            description: data.description ?? null,
            parentId: data.parentId ? Number(data.parentId) : null,
            imageUrl: data.imageUrl ?? null,
        } as any);
    },

    async delete(id: number) {
        const category = await categoryRepository.findById(id);
        if (!category) throw new AppError(404, 'CATEGORY_NOT_FOUND', 'categories:errors.notFound');
        if (category._count.children > 0) throw new AppError(409, 'HAS_CHILDREN', 'categories:errors.hasChildren');
        if (category._count.products > 0) throw new AppError(409, 'HAS_PRODUCTS', 'categories:errors.hasProducts');

        // Cleanup image (best-effort)
        if (category.imageUrl) {
            const publicId = cloudinaryService.extractPublicId(category.imageUrl);
            if (publicId) cloudinaryService.deleteImage(publicId).catch(() => { });
        }
        await categoryRepository.delete(id);
    },

    async uploadImage(file: Express.Multer.File) {
        const base64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
        return cloudinaryService.uploadProductVariantImage(base64, { productSku: 'categories', category: 'categories' });
    },
};
