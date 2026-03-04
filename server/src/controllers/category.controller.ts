import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { cloudinaryService } from '../services/cloudinary.service';
import { upload } from '../middleware/upload.middleware';

// ─── Vietnamese Slug Utility ────────────────────────────────────────────────

const VI_MAP: Record<string, string> = {
    à: 'a', á: 'a', â: 'a', ã: 'a', ả: 'a', ạ: 'a',
    ă: 'a', ắ: 'a', ặ: 'a', ằ: 'a', ẳ: 'a', ẵ: 'a',
    ấ: 'a', ầ: 'a', ẩ: 'a', ẫ: 'a', ậ: 'a',
    è: 'e', é: 'e', ê: 'e', ẽ: 'e', ẻ: 'e', ẹ: 'e',
    ế: 'e', ề: 'e', ể: 'e', ễ: 'e', ệ: 'e',
    ì: 'i', í: 'i', ĩ: 'i', ỉ: 'i', ị: 'i',
    ò: 'o', ó: 'o', ô: 'o', õ: 'o', ỏ: 'o', ọ: 'o',
    ố: 'o', ồ: 'o', ổ: 'o', ỗ: 'o', ộ: 'o',
    ơ: 'o', ớ: 'o', ờ: 'o', ở: 'o', ỡ: 'o', ợ: 'o',
    ù: 'u', ú: 'u', û: 'u', ũ: 'u', ủ: 'u', ụ: 'u',
    ư: 'u', ứ: 'u', ừ: 'u', ử: 'u', ữ: 'u', ự: 'u',
    ỳ: 'y', ý: 'y', ỹ: 'y', ỷ: 'y', ỵ: 'y',
    đ: 'd',
    // uppercase
    À: 'a', Á: 'a', Â: 'a', Ã: 'a', Ả: 'a', Ạ: 'a',
    Ă: 'a', Ắ: 'a', Ặ: 'a', Ằ: 'a', Ẳ: 'a', Ẵ: 'a',
    Ấ: 'a', Ầ: 'a', Ẩ: 'a', Ẫ: 'a', Ậ: 'a',
    È: 'e', É: 'e', Ê: 'e', Ẽ: 'e', Ẻ: 'e', Ẹ: 'e',
    Ế: 'e', Ề: 'e', Ể: 'e', Ễ: 'e', Ệ: 'e',
    Ì: 'i', Í: 'i', Ĩ: 'i', Ỉ: 'i', Ị: 'i',
    Ò: 'o', Ó: 'o', Ô: 'o', Õ: 'o', Ỏ: 'o', Ọ: 'o',
    Ố: 'o', Ồ: 'o', Ổ: 'o', Ỗ: 'o', Ộ: 'o',
    Ơ: 'o', Ớ: 'o', Ờ: 'o', Ở: 'o', Ỡ: 'o', Ợ: 'o',
    Ù: 'u', Ú: 'u', Û: 'u', Ũ: 'u', Ủ: 'u', Ụ: 'u',
    Ư: 'u', Ứ: 'u', Ừ: 'u', Ử: 'u', Ữ: 'u', Ự: 'u',
    Ỳ: 'y', Ý: 'y', Ỹ: 'y', Ỷ: 'y', Ỵ: 'y',
    Đ: 'd',
};

function generateSlug(name: string): string {
    return name
        .split('')
        .map(c => VI_MAP[c] ?? c)
        .join('')
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

// ─── Flat-to-Tree Mapper (O(n)) ─────────────────────────────────────────────

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

    for (const cat of flat) {
        map.set(cat.categoryId, { ...cat, children: [] });
    }

    for (const node of map.values()) {
        if (node.parentId !== null && map.has(node.parentId)) {
            map.get(node.parentId)!.children.push(node);
        } else {
            roots.push(node);
        }
    }

    return roots;
}

// ─── Circular-Parent Check ──────────────────────────────────────────────────
// Returns true if proposedParentId is equal to categoryId or is a descendant of it

async function isCircularParent(
    categoryId: number,
    proposedParentId: number
): Promise<boolean> {
    if (proposedParentId === categoryId) return true;

    // Walk downward from categoryId and see if proposedParentId is a descendant
    const allCats = await prisma.category.findMany({
        select: { categoryId: true, parentId: true },
    });

    const childMap = new Map<number, number[]>();
    for (const c of allCats) {
        if (c.parentId !== null) {
            if (!childMap.has(c.parentId)) childMap.set(c.parentId, []);
            childMap.get(c.parentId)!.push(c.categoryId);
        }
    }

    const stack = [categoryId];
    while (stack.length > 0) {
        const current = stack.pop()!;
        const children = childMap.get(current) ?? [];
        for (const child of children) {
            if (child === proposedParentId) return true;
            stack.push(child);
        }
    }

    return false;
}

// ─── GET /api/categories/tree ───────────────────────────────────────────────

export const getCategoriesTree = async (_req: Request, res: Response) => {
    try {
        const flat = await (prisma.category.findMany as any)({
            select: {
                categoryId: true,
                parentId: true,
                name: true,
                slug: true,
                description: true,
                imageUrl: true,
                _count: { select: { products: true } },
            },
            orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
        }) as CategoryRaw[];

        const tree = buildTree(flat);
        res.json(tree);
    } catch (error: any) {
        console.error('Get categories tree error:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
};

// ─── GET /api/categories/flat ───────────────────────────────────────────────

export const getCategoriesFlat = async (_req: Request, res: Response) => {
    try {
        const cats = await (prisma.category.findMany as any)({
            select: {
                categoryId: true,
                parentId: true,
                name: true,
                slug: true,
            },
            orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
        });
        res.json(cats);
    } catch (error: any) {
        console.error('Get categories flat error:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
};

// ─── POST /api/categories ───────────────────────────────────────────────────

export const createCategory = async (req: Request, res: Response) => {
    try {
        const { name, parentId, description, imageUrl } = req.body;

        if (!name || typeof name !== 'string' || name.trim() === '') {
            return res.status(400).json({ error: 'Category name is required.', code: 'INVALID_CATEGORY_NAME' });
        }

        const slug = generateSlug(name.trim());

        const category = await (prisma.category.create as any)({
            data: {
                name: name.trim(),
                slug,
                description: description ?? null,
                parentId: parentId ? Number(parentId) : null,
                imageUrl: imageUrl ?? null,
            },
        });

        res.status(201).json({
            success: true,
            message: 'Category created successfully.',
            data: category,
        });
    } catch (error: any) {
        console.error('Create category error:', error);
        if (error.code === 'P2002' || error.message?.includes('Unique constraint')) {
            return res.status(409).json({ error: 'Category slug already exists. Please use a different name.', code: 'DUPLICATE_SLUG' });
        }
        res.status(500).json({ error: error.message || 'Server error.' });
    }
};

// ─── PUT /api/categories/:id ────────────────────────────────────────────────

export const updateCategory = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'Invalid category ID.', code: 'INVALID_CATEGORY_ID' });

        const { name, parentId, description, imageUrl } = req.body;

        if (!name || typeof name !== 'string' || name.trim() === '') {
            return res.status(400).json({ error: 'Category name is required.', code: 'INVALID_CATEGORY_NAME' });
        }

        // Circular parent check
        if (parentId !== null && parentId !== undefined) {
            const circular = await isCircularParent(id, Number(parentId));
            if (circular) {
                return res.status(400).json({
                    error: 'Cannot select a child category as a parent.',
                    code: 'CIRCULAR_PARENT'
                });
            }
        }

        const slug = generateSlug(name.trim());

        const category = await (prisma.category.update as any)({
            where: { categoryId: id },
            data: {
                name: name.trim(),
                slug,
                description: description ?? null,
                parentId: parentId ? Number(parentId) : null,
                imageUrl: imageUrl ?? null,
            },
        });

        res.json({
            success: true,
            message: 'Category updated successfully.',
            data: category,
        });
    } catch (error: any) {
        console.error('Update category error:', error);
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Category not found.', code: 'CATEGORY_NOT_FOUND' });
        }
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'Category slug already exists. Please use a different name.', code: 'DUPLICATE_SLUG' });
        }
        res.status(500).json({ error: error.message || 'Server error.' });
    }
};

// ─── DELETE /api/categories/:id ─────────────────────────────────────────────

export const deleteCategory = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'Invalid category ID.', code: 'INVALID_CATEGORY_ID' });

        // Check existence
        const category = await (prisma.category.findUnique as any)({
            where: { categoryId: id },
            select: {
                categoryId: true,
                imageUrl: true,
                _count: { children: true, products: true }
            },
        });

        if (!category) {
            return res.status(404).json({ error: 'Category not found.', code: 'CATEGORY_NOT_FOUND' });
        }

        // Block if has children
        if (category._count.children > 0) {
            return res.status(409).json({
                error: 'Must delete or move child categories first.',
                code: 'HAS_CHILDREN'
            });
        }

        // Block if has products
        if (category._count.products > 0) {
            return res.status(409).json({
                error: 'Category contains products. Please remove products first.',
                code: 'HAS_PRODUCTS'
            });
        }

        // Delete image from Cloudinary if present
        if (category.imageUrl) {
            const publicId = cloudinaryService.extractPublicId(category.imageUrl);
            if (publicId) {
                await cloudinaryService.deleteImage(publicId).catch(() => {/* non-fatal */ });
            }
        }

        // Hard delete
        await prisma.category.delete({ where: { categoryId: id } });

        res.json({ success: true, message: 'Category deleted successfully.' });
    } catch (error: any) {
        console.error('Delete category error:', error);
        res.status(500).json({ error: error.message || 'Server error.' });
    }
};

// ─── POST /api/categories/upload-image ─────────────────────────────────────

export const uploadCategoryImage = async (req: Request, res: Response) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ success: false, error: 'No image file provided.', code: 'NO_IMAGE_FILE' });
        }

        const base64Data = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

        const result = await cloudinaryService.uploadProductVariantImage(base64Data, {
            productSku: 'categories',
            category: 'categories',
        });

        res.status(201).json({
            success: true,
            imageUrl: result.secureUrl,
            optimizedUrl: result.optimizedUrl,
        });
    } catch (error: any) {
        console.error('Upload category image error:', error);
        res.status(500).json({ success: false, error: error.message || 'Image upload error.' });
    }
};

export { upload };
