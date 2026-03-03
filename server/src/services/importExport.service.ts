
import ExcelJS from 'exceljs';
import { z } from 'zod';
import { prisma } from '../utils/prisma';

// ─── Column Definitions ───────────────────────────────────────────────────────

const COLUMNS = [
    { header: 'Handle', key: 'handle', width: 28 },
    { header: 'Tên sản phẩm', key: 'name', width: 32 },
    { header: 'Mô tả', key: 'description', width: 45 },
    { header: 'Danh mục', key: 'category', width: 20 },
    { header: 'SKU', key: 'sku', width: 20 },
    { header: 'Giá bán', key: 'price', width: 15 },
    { header: 'Tồn kho', key: 'stock', width: 12 },
    { header: 'Nhóm phân loại 1', key: 'attr1Name', width: 22 },
    { header: 'Giá trị 1', key: 'attr1Value', width: 18 },
    { header: 'Nhóm phân loại 2', key: 'attr2Name', width: 22 },
    { header: 'Giá trị 2', key: 'attr2Value', width: 18 },
    { header: 'URL Hình ảnh', key: 'imageUrl', width: 50 },
] as const;

// ─── Zod Validation Schema ────────────────────────────────────────────────────

const RowSchema = z.object({
    handle: z.string().min(1, 'Handle không được để trống'),
    name: z.string().optional(),
    description: z.string().optional(),
    category: z.string().optional(),
    sku: z.string().min(1, 'SKU không được để trống'),
    price: z.coerce.number().positive('Giá bán phải lớn hơn 0'),
    stock: z.coerce.number().nonnegative('Tồn kho không được âm'),
    attr1Name: z.string().optional(),
    attr1Value: z.string().optional(),
    attr2Name: z.string().optional(),
    attr2Value: z.string().optional(),
    imageUrl: z.string().optional(),
});

type RowData = z.infer<typeof RowSchema>;

// ─── Import Report Types ──────────────────────────────────────────────────────

export interface ImportError {
    row: number;
    handle: string;
    reason: string;
}

export interface ImportReport {
    total: number;
    success: number;
    failed: number;
    errors: ImportError[];
}

// ─── Helper: Create Styled Workbook with Headers ──────────────────────────────

function createStyledWorkbook(): { workbook: ExcelJS.Workbook; worksheet: ExcelJS.Worksheet } {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AISTHEA Admin';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Sản phẩm', {
        views: [{ state: 'frozen', ySplit: 1 }],
    });

    worksheet.columns = COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.width }));

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.height = 22;
    headerRow.eachCell((cell) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFDC2626' }, // red primary
        };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Be Vietnam Pro', size: 11 };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
            bottom: { style: 'thin', color: { argb: 'FFCC0000' } },
        };
    });

    return { workbook, worksheet };
}

// ─── Generate Template ────────────────────────────────────────────────────────

export async function generateTemplate(): Promise<Buffer> {
    const { workbook, worksheet } = createStyledWorkbook();

    // Add two sample rows to guide users
    const samples = [
        {
            handle: 'ao-khoac-nam-den',
            name: 'Áo Khoác Nam Đen',
            description: 'Chất liệu cao cấp, phù hợp mùa đông',
            category: 'Áo khoác',
            sku: 'AK-NAM-DEN-S',
            price: 850000,
            stock: 50,
            attr1Name: 'Màu sắc',
            attr1Value: 'Đen',
            attr2Name: 'Kích thước',
            attr2Value: 'S',
            imageUrl: 'https://example.com/image.jpg',
        },
        {
            handle: 'ao-khoac-nam-den',
            name: '',
            description: '',
            category: '',
            sku: 'AK-NAM-DEN-M',
            price: 850000,
            stock: 30,
            attr1Name: 'Màu sắc',
            attr1Value: 'Đen',
            attr2Name: 'Kích thước',
            attr2Value: 'M',
            imageUrl: '',
        },
    ];

    samples.forEach((row, idx) => {
        const r = worksheet.addRow(row);
        r.height = 18;
        r.eachCell((cell) => {
            cell.font = { name: 'Be Vietnam Pro', size: 10, color: { argb: idx === 0 ? 'FF111111' : 'FF555555' } };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: idx === 0 ? 'FFFFEAEA' : 'FFFFF9F9' },
            };
        });
    });

    // Add a note row below
    const noteRow = worksheet.addRow(['← Xóa các hàng mẫu trước khi nhập thật. Giữ nguyên header hàng 1.']);
    noteRow.getCell(1).font = { italic: true, color: { argb: 'FF999999' }, size: 9 };
    worksheet.mergeCells(`A${noteRow.number}:L${noteRow.number}`);

    const rawBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(rawBuffer as unknown as ArrayBuffer);
}

// ─── Export All Products ──────────────────────────────────────────────────────

export async function exportProducts(): Promise<Buffer> {
    // Fetch all active products with relations
    const products = await prisma.product.findMany({
        where: { isDeleted: false },
        orderBy: { productId: 'asc' },
        include: {
            category: { select: { name: true } },
            images: {
                where: { isPrimary: true },
                select: { imageUrl: true },
                take: 1,
            },
            variants: {
                where: { isDeleted: false },
                orderBy: { variantId: 'asc' },
                include: {
                    variantAttributes: {
                        include: {
                            value: {
                                include: { attribute: { select: { name: true } } },
                            },
                        },
                    },
                },
            },
        },
    });

    const { workbook, worksheet } = createStyledWorkbook();

    for (const product of products) {
        const handle = product.slug;
        const primaryImage = product.images[0]?.imageUrl ?? '';

        if (product.variants.length === 0) {
            // Product with no variants — write one row
            worksheet.addRow({
                handle,
                name: product.name,
                description: product.description ?? '',
                category: product.category?.name ?? '',
                sku: '',
                price: Number(product.basePrice),
                stock: 0,
                attr1Name: '',
                attr1Value: '',
                attr2Name: '',
                attr2Value: '',
                imageUrl: primaryImage,
            });
        } else {
            product.variants.forEach((variant, idx) => {
                // Extract attributes (up to 2)
                const attrs = variant.variantAttributes.map((va) => ({
                    name: va.value.attribute.name,
                    value: va.value.value,
                }));

                const row = {
                    handle,
                    // Only first variant row gets product-level info
                    name: idx === 0 ? product.name : '',
                    description: idx === 0 ? (product.description ?? '') : '',
                    category: idx === 0 ? (product.category?.name ?? '') : '',
                    sku: variant.sku,
                    price: Number(variant.price),
                    stock: variant.stockQuantity,
                    attr1Name: attrs[0]?.name ?? '',
                    attr1Value: attrs[0]?.value ?? '',
                    attr2Name: attrs[1]?.name ?? '',
                    attr2Value: attrs[1]?.value ?? '',
                    imageUrl: idx === 0 ? primaryImage : '',
                };
                worksheet.addRow(row);
            });
        }
    }

    // Style data rows
    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        row.height = 17;
        row.eachCell((cell) => {
            cell.font = { name: 'Be Vietnam Pro', size: 10 };
            cell.alignment = { vertical: 'middle' };
        });
        // Zebra striping
        if (rowNumber % 2 === 0) {
            row.eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9F9F9' } };
            });
        }
    });

    const rawBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(rawBuffer as unknown as ArrayBuffer);
}

// ─── Import Products ──────────────────────────────────────────────────────────

export async function importProducts(fileBuffer: Buffer): Promise<ImportReport> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer as any);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
        return { total: 0, success: 0, failed: 1, errors: [{ row: 0, handle: '', reason: 'File Excel không có sheet nào' }] };
    }

    // Parse rows (skip header row 1)
    const rawRows: { rowNum: number; data: Record<string, any> }[] = [];

    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // skip header

        const getCellValue = (colKey: string): string => {
            const colIdx = COLUMNS.findIndex((c) => c.key === colKey);
            if (colIdx === -1) return '';
            const cell = row.getCell(colIdx + 1);
            const val = cell.value;
            if (val === null || val === undefined) return '';
            if (typeof val === 'object' && 'result' in val) return String((val as any).result ?? '');
            return String(val).trim();
        };

        const data: Record<string, any> = {};
        COLUMNS.forEach((c) => { data[c.key] = getCellValue(c.key); });

        // Skip entirely blank rows
        if (!data.handle && !data.sku) return;

        rawRows.push({ rowNum: rowNumber, data });
    });

    // Skip sample/instruction rows
    const dataRows = rawRows.filter((r) => {
        const note = String(r.data.handle ?? '').toLowerCase();
        return !note.startsWith('←') && !note.startsWith('<') && !note.includes('xóa các hàng mẫu');
    });

    if (dataRows.length === 0) {
        return { total: 0, success: 0, failed: 0, errors: [] };
    }

    // Group rows by Handle, preserving first-row product info
    const groups = new Map<string, { rows: { rowNum: number; data: Record<string, any> }[]; productInfo: Record<string, any> }>();
    for (const r of dataRows) {
        const handle = String(r.data.handle ?? '').trim();
        if (!handle) continue;
        if (!groups.has(handle)) {
            groups.set(handle, { rows: [], productInfo: r.data });
        }
        groups.get(handle)!.rows.push(r);
        // Update product info from whichever row has non-empty name
        if (r.data.name) {
            groups.get(handle)!.productInfo = r.data;
        }
    }

    const errors: ImportError[] = [];
    let successCount = 0;
    const totalVariants = dataRows.length;

    // Process each product group in isolated transactions
    const results = await Promise.allSettled(
        Array.from(groups.entries()).map(async ([handle, group]) => {
            // Validate each row in the group
            const validatedVariants: { rowNum: number; data: RowData }[] = [];
            for (const r of group.rows) {
                const parsed = RowSchema.safeParse(r.data);
                if (!parsed.success) {
                    const reason = (parsed.error.issues ?? []).map((e: any) => e.message).join('; ');
                    errors.push({ row: r.rowNum, handle, reason });
                    continue;
                }
                validatedVariants.push({ rowNum: r.rowNum, data: parsed.data });
            }

            if (validatedVariants.length === 0) return { upserted: 0 };

            const productInfo = group.productInfo;

            // Resolve category (optional)
            let categoryId: number | undefined;
            if (productInfo.category) {
                const cat = await prisma.category.findFirst({
                    where: { name: { contains: productInfo.category } },
                    select: { categoryId: true },
                });
                categoryId = cat?.categoryId;
            }

            // Upsert in isolated transaction
            return prisma.$transaction(async (tx) => {
                // Find or create product by slug (handle)
                let product = await tx.product.findFirst({
                    where: { slug: handle, isDeleted: false },
                    select: { productId: true },
                });

                if (product) {
                    // UPDATE basic fields if provided
                    await tx.product.update({
                        where: { productId: product.productId },
                        data: {
                            ...(productInfo.name ? { name: productInfo.name } : {}),
                            ...(productInfo.description ? { description: productInfo.description } : {}),
                            ...(categoryId ? { categoryId } : {}),
                        },
                    });
                } else {
                    // CREATE new product
                    if (!productInfo.name) {
                        throw new Error(`Sản phẩm mới (handle: ${handle}) thiếu "Tên sản phẩm"`);
                    }
                    const firstPrice = Number(validatedVariants[0]?.data.price ?? 0);
                    product = await tx.product.create({
                        data: {
                            name: productInfo.name,
                            slug: handle,
                            description: productInfo.description || null,
                            basePrice: firstPrice as any,
                            status: 'Active',
                            categoryId: categoryId ?? 1, // fallback to first category
                        },
                        select: { productId: true },
                    });
                }

                const productId = product.productId;
                let upserted = 0;

                for (const { data } of validatedVariants) {
                    // Check if SKU already exists
                    const existingVariant = await tx.productVariant.findFirst({
                        where: { sku: data.sku, isDeleted: false },
                        select: { variantId: true, productId: true },
                    });

                    if (existingVariant) {
                        // UPDATE existing variant price/stock
                        await tx.productVariant.update({
                            where: { variantId: existingVariant.variantId },
                            data: {
                                price: data.price as any,
                                stockQuantity: data.stock,
                            },
                        });
                    } else {
                        // CREATE new variant
                        const isFirst = upserted === 0;
                        const newVariant = await tx.productVariant.create({
                            data: {
                                productId,
                                sku: data.sku,
                                price: data.price as any,
                                stockQuantity: data.stock,
                                isDefault: isFirst,
                            },
                        });

                        // Link attributes (up to 2)
                        const attrPairs: { name: string; value: string }[] = [];
                        if (data.attr1Name && data.attr1Value) {
                            attrPairs.push({ name: data.attr1Name, value: data.attr1Value });
                        }
                        if (data.attr2Name && data.attr2Value) {
                            attrPairs.push({ name: data.attr2Name, value: data.attr2Value });
                        }

                        for (const ap of attrPairs) {
                            // Upsert Attribute
                            const attribute = await tx.attribute.upsert({
                                where: { name: ap.name },
                                create: { name: ap.name },
                                update: {},
                            });

                            // Upsert AttributeValue
                            let attrValue = await tx.attributeValue.findFirst({
                                where: { attributeId: attribute.attributeId, value: ap.value },
                            });
                            if (!attrValue) {
                                attrValue = await tx.attributeValue.create({
                                    data: { attributeId: attribute.attributeId, value: ap.value },
                                });
                            }

                            // Link VariantAttribute
                            await tx.variantAttribute.upsert({
                                where: { variantId_valueId: { variantId: newVariant.variantId, valueId: attrValue.valueId } },
                                create: { variantId: newVariant.variantId, valueId: attrValue.valueId },
                                update: {},
                            });
                        }

                        // Add image if provided and this is first variant
                        if (data.imageUrl && isFirst) {
                            const existingImages = await tx.productImage.count({ where: { productId } });
                            if (existingImages === 0) {
                                await tx.productImage.create({
                                    data: {
                                        productId,
                                        imageUrl: data.imageUrl,
                                        isPrimary: true,
                                    },
                                });
                            }
                        }
                    }

                    upserted++;
                }

                return { upserted };
            });
        })
    );

    // Tally results
    for (const result of results) {
        if (result.status === 'fulfilled') {
            successCount += (result.value as any).upserted ?? 0;
        } else {
            // Transaction-level failure — attribute to first row of that group
            const err = result.reason as Error;
            errors.push({ row: -1, handle: '?', reason: err.message ?? 'Lỗi không xác định' });
        }
    }

    return {
        total: totalVariants,
        success: successCount,
        failed: errors.length,
        errors,
    };
}
