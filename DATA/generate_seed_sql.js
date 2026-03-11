/**
 * generate_seed_sql.js
 * Reads CSV files from DATA folder and generates a clean SQL seed file
 * 
 * Image naming convention:
 *   {ColorGroupIndex}_{viewAngle}.jpg   (viewAngle: 1, 3, 4)
 *   300 color groups × 3 angles = 900 images
 *
 * Usage: node generate_seed_sql.js
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = __dirname;
const OUTPUT_SQL = path.join(__dirname, '..', 'server', 'database', '03_seed_data_standard.sql');

// ── CSV Parser ────────────────────────────────────────────────────────────────
function parseCSV(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(l => l.trim());
    const headers = lines[0].split(',').map(h => h.trim());

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Handle quoted fields (commas inside quotes)
        const fields = [];
        let current = '';
        let inQuotes = false;
        for (let c = 0; c < line.length; c++) {
            if (line[c] === '"') {
                inQuotes = !inQuotes;
            } else if (line[c] === ',' && !inQuotes) {
                fields.push(current.trim());
                current = '';
            } else {
                current += line[c];
            }
        }
        fields.push(current.trim());

        const row = {};
        headers.forEach((h, idx) => {
            row[h] = fields[idx] !== undefined ? fields[idx] : '';
        });
        rows.push(row);
    }
    return rows;
}

// ── Escape SQL strings ────────────────────────────────────────────────────────
function sqlStr(val) {
    if (val === null || val === undefined || val === '') return 'NULL';
    return `N'${String(val).replace(/'/g, "''")}'`;
}

function sqlInt(val) {
    if (val === null || val === undefined || val === '') return 'NULL';
    return parseInt(val, 10);
}

function sqlDec(val) {
    if (val === null || val === undefined || val === '') return '0';
    return parseFloat(val).toFixed(2);
}

function sqlBit(val) {
    return (val === '1' || val === 'true' || val === true) ? '1' : '0';
}

// ── Load CSV data ─────────────────────────────────────────────────────────────
console.log('Loading CSV files...');

const products = parseCSV(path.join(DATA_DIR, 'products_db_import.csv'));
const variants = parseCSV(path.join(DATA_DIR, 'product_variants_db_import.csv'));
const attributes = parseCSV(path.join(DATA_DIR, 'attributes_db_import.csv'));
const attrValues = parseCSV(path.join(DATA_DIR, 'attribute_values_db_import.csv'));
const variantAttrs = parseCSV(path.join(DATA_DIR, 'variant_attributes_db_import.csv'));
const imageMapping = parseCSV(path.join(DATA_DIR, 'image_mapping.csv'));

console.log(`  Products: ${products.length}`);
console.log(`  Variants: ${variants.length}`);
console.log(`  Attributes: ${attributes.length}`);
console.log(`  AttributeValues: ${attrValues.length}`);
console.log(`  VariantAttributes: ${variantAttrs.length}`);
console.log(`  ImageMapping (color groups): ${imageMapping.length}`);

// ── Categories (hardcoded - same as existing seed) ───────────────────────────
const categories = [
    { id: 1, name: 'Nam - Áo', slug: 'nam-ao', desc: 'Thời trang nam - Áo' },
    { id: 2, name: 'Nam - Quần', slug: 'nam-quan', desc: 'Thời trang nam - Quần' },
    { id: 3, name: 'Nam - Áo khoác', slug: 'nam-ao-khoac', desc: 'Thời trang nam - Áo khoác' },
    { id: 4, name: 'Nữ - Áo', slug: 'nu-ao', desc: 'Thời trang nữ - Áo' },
    { id: 5, name: 'Váy & Đầm', slug: 'vay-dam', desc: 'Thời trang nữ - Váy và Đầm' },
    { id: 6, name: 'Nữ - Quần', slug: 'nu-quan', desc: 'Thời trang nữ - Quần' },
    { id: 7, name: 'Phụ kiện', slug: 'phu-kien', desc: 'Phụ kiện thời trang' },
    { id: 8, name: 'Giày dép', slug: 'giay-dep', desc: 'Giày dép thời trang' },
];

// ── Build image map: ProductId → [{colorGroupIndex, colorName, firstVariantId}] 
const productImageMap = {}; // productId → [{colorGroupIdx, colorName, firstVariantId}]

for (const row of imageMapping) {
    const productId = parseInt(row['ProductId'], 10);
    const colorGroupIdx = parseInt(row['ColorGroupIndex'], 10);
    const colorName = row['ColorName'] || '';

    // Get first variant ID from the VariantIds field
    const variantIdsStr = row['VariantIds'] || '';
    const firstVariantId = parseInt(variantIdsStr.split(',')[0], 10);

    if (!productImageMap[productId]) {
        productImageMap[productId] = [];
    }
    productImageMap[productId].push({
        colorGroupIdx,
        colorName,
        firstVariantId: isNaN(firstVariantId) ? null : firstVariantId
    });
}

// ── Generate SQL ──────────────────────────────────────────────────────────────
const lines = [];

lines.push(`
/* =============================================================
   FILE: server/database/03_seed_data_standard.sql
   DESCRIPTION: Dữ liệu chuẩn được generate từ DATA/CSV files
   Generated: ${new Date().toISOString()}
   ============================================================= */

USE [AISTHEA];
GO

-- ============================================================
-- STEP 1: Clean up existing product data (reverse dependency)
-- ============================================================
IF OBJECT_ID('dbo.VariantAttributes', 'U') IS NOT NULL DELETE FROM [VariantAttributes];
IF OBJECT_ID('dbo.ProductImages', 'U') IS NOT NULL DELETE FROM [ProductImages];
IF OBJECT_ID('dbo.ProductImages', 'U') IS NOT NULL DBCC CHECKIDENT ('[ProductImages]', RESEED, 0);
IF OBJECT_ID('dbo.CartItems', 'U') IS NOT NULL DELETE FROM [CartItems];
IF OBJECT_ID('dbo.ProductVariants', 'U') IS NOT NULL DELETE FROM [ProductVariants];
IF OBJECT_ID('dbo.ProductVariants', 'U') IS NOT NULL DBCC CHECKIDENT ('[ProductVariants]', RESEED, 0);
IF OBJECT_ID('dbo.Products', 'U') IS NOT NULL DELETE FROM [Products];
IF OBJECT_ID('dbo.Products', 'U') IS NOT NULL DBCC CHECKIDENT ('[Products]', RESEED, 0);
IF OBJECT_ID('dbo.Categories', 'U') IS NOT NULL DELETE FROM [Categories];
IF OBJECT_ID('dbo.Categories', 'U') IS NOT NULL DBCC CHECKIDENT ('[Categories]', RESEED, 0);
IF OBJECT_ID('dbo.AttributeValues', 'U') IS NOT NULL DELETE FROM [AttributeValues];
IF OBJECT_ID('dbo.AttributeValues', 'U') IS NOT NULL DBCC CHECKIDENT ('[AttributeValues]', RESEED, 0);
IF OBJECT_ID('dbo.Attributes', 'U') IS NOT NULL DELETE FROM [Attributes];
IF OBJECT_ID('dbo.Attributes', 'U') IS NOT NULL DBCC CHECKIDENT ('[Attributes]', RESEED, 0);
GO

PRINT 'Cleaned up existing product data';
GO
`);

// ── Attributes ──────────────────────────────────────────────────────────────
lines.push(`
-- ============================================================
-- STEP 2: Attributes
-- ============================================================
SET IDENTITY_INSERT [Attributes] ON;`);

for (const a of attributes) {
    lines.push(`INSERT INTO [Attributes] ([AttributeId],[Name]) VALUES (${sqlInt(a['AttributeId'])},${sqlStr(a['Name'])});`);
}
lines.push(`SET IDENTITY_INSERT [Attributes] OFF;
GO
PRINT 'Inserted ${attributes.length} Attributes';
GO`);

// ── AttributeValues ─────────────────────────────────────────────────────────
lines.push(`
-- ============================================================
-- STEP 3: AttributeValues
-- ============================================================
SET IDENTITY_INSERT [AttributeValues] ON;`);

for (const av of attrValues) {
    lines.push(`INSERT INTO [AttributeValues] ([ValueId],[AttributeId],[Value]) VALUES (${sqlInt(av['ValueId'])},${sqlInt(av['AttributeId'])},${sqlStr(av['Value'])});`);
}
lines.push(`SET IDENTITY_INSERT [AttributeValues] OFF;
GO
PRINT 'Inserted ${attrValues.length} AttributeValues';
GO`);

// ── Categories ──────────────────────────────────────────────────────────────
lines.push(`
-- ============================================================
-- STEP 4: Categories
-- ============================================================
SET IDENTITY_INSERT [Categories] ON;`);

for (const c of categories) {
    lines.push(`INSERT INTO [Categories] ([CategoryId],[Name],[Slug],[Description]) VALUES (${c.id},${sqlStr(c.name)},${sqlStr(c.slug)},${sqlStr(c.desc)});`);
}
lines.push(`SET IDENTITY_INSERT [Categories] OFF;
GO
PRINT 'Inserted ${categories.length} Categories';
GO`);

// ── Products ─────────────────────────────────────────────────────────────────
lines.push(`
-- ============================================================
-- STEP 5: Products (100 sản phẩm)
-- ============================================================
SET IDENTITY_INSERT [Products] ON;`);

for (const p of products) {
    const categoryId = sqlInt(p['CategoryId']);
    const brandId = (p['BrandId'] && p['BrandId'] !== '') ? sqlInt(p['BrandId']) : 'NULL';
    const createdAt = p['CreatedAt'] ? sqlStr(p['CreatedAt']) : 'N\'2026-02-08 10:00:00\'';
    lines.push(
        `INSERT INTO [Products] ([ProductId],[CategoryId],[BrandId],[Name],[Slug],[Description],[BasePrice],[Status],[IsDeleted],[CreatedAt]) ` +
        `VALUES (${sqlInt(p['ProductId'])},${categoryId},${brandId},${sqlStr(p['Name'])},${sqlStr(p['Slug'])},${sqlStr(p['Description'])},${sqlDec(p['BasePrice'])},${sqlStr(p['Status'])},${sqlBit(p['IsDeleted'])},${createdAt});`
    );
}
lines.push(`SET IDENTITY_INSERT [Products] OFF;
GO
PRINT 'Inserted ${products.length} Products';
GO`);

// ── ProductVariants ──────────────────────────────────────────────────────────
lines.push(`
-- ============================================================
-- STEP 6: ProductVariants (1099 variants, stock=50, uniform price)
-- ============================================================
SET IDENTITY_INSERT [ProductVariants] ON;`);

// Build a product price lookup
const productPriceMap = {};
for (const p of products) {
    productPriceMap[parseInt(p['ProductId'])] = parseFloat(p['BasePrice']);
}

// Track first variant per product to set IsDefault=1
const firstVariantPerProduct = {};

for (const v of variants) {
    const productId = parseInt(v['ProductId'], 10);
    const variantId = parseInt(v['VariantId'], 10);
    const price = productPriceMap[productId] || parseFloat(v['Price']) || 0;
    const stock = 50;

    // First variant of each product becomes default
    let isDefault = 0;
    if (!firstVariantPerProduct[productId]) {
        firstVariantPerProduct[productId] = variantId;
        isDefault = 1;
    }

    lines.push(
        `INSERT INTO [ProductVariants] ([VariantId],[ProductId],[SKU],[Price],[StockQuantity],[IsDefault],[IsDeleted]) ` +
        `VALUES (${variantId},${productId},${sqlStr(v['SKU'])},${price.toFixed(2)},${stock},${isDefault},0);`
    );
}
lines.push(`SET IDENTITY_INSERT [ProductVariants] OFF;
GO
PRINT 'Inserted ${variants.length} ProductVariants';
GO`);

// ── VariantAttributes ────────────────────────────────────────────────────────
lines.push(`
-- ============================================================
-- STEP 7: VariantAttributes (${variantAttrs.length} mappings)
-- ============================================================`);

// Batch inserts in groups of 500 for performance
const BATCH_SIZE = 500;
for (let i = 0; i < variantAttrs.length; i += BATCH_SIZE) {
    const batch = variantAttrs.slice(i, i + BATCH_SIZE);
    for (const va of batch) {
        lines.push(`INSERT INTO [VariantAttributes]([VariantId],[ValueId]) VALUES(${sqlInt(va['VariantId'])},${sqlInt(va['ValueId'])});`);
    }
    if ((i + BATCH_SIZE) < variantAttrs.length) {
        lines.push(`GO`);
    }
}
lines.push(`GO
PRINT 'Inserted ${variantAttrs.length} VariantAttributes';
GO`);

// ── ProductImages ────────────────────────────────────────────────────────────
lines.push(`
-- ============================================================
-- STEP 8: ProductImages
-- Image convention: /images/products/{ColorGroupIndex}_{viewAngle}.jpg
-- 3 view angles per color group: _1.jpg (front), _3.jpg (back), _4.jpg (detail)
-- 300 color groups × 3 angles = 900 images total
-- VariantId is linked to first variant of the color group
-- ============================================================
SET IDENTITY_INSERT [ProductImages] ON;`);

let imageId = 1;
const viewAngles = [1, 3, 4];
const viewLabels = { 1: 'front', 3: 'back', 4: 'detail' };

// Sort image mapping by ColorGroupIndex for consistent ordering
const sortedImageMap = [...imageMapping].sort((a, b) =>
    parseInt(a['ColorGroupIndex']) - parseInt(b['ColorGroupIndex'])
);

for (const row of sortedImageMap) {
    const colorGroupIdx = parseInt(row['ColorGroupIndex'], 10);
    const productId = parseInt(row['ProductId'], 10);

    // Get first variant in this color group
    const variantIdsStr = row['VariantIds'] || '';
    const firstVariantId = parseInt(variantIdsStr.split(',')[0], 10);
    const variantIdSql = isNaN(firstVariantId) ? 'NULL' : firstVariantId;

    // Insert 3 images per color group (3 view angles)
    for (let angleIdx = 0; angleIdx < viewAngles.length; angleIdx++) {
        const angle = viewAngles[angleIdx];
        const isPrimary = (angleIdx === 0 && colorGroupIdx === (productImageMap[productId]?.[0]?.colorGroupIdx)) ? 1 : 0;
        const imageUrl = `/images/products/${colorGroupIdx}_${angle}.jpg`;
        const thumbnailUrl = `/images/products/${colorGroupIdx}_${angle}.jpg`;

        lines.push(
            `INSERT INTO [ProductImages] ([ImageId],[ProductId],[VariantId],[ImageUrl],[ThumbnailUrl],[IsPrimary]) ` +
            `VALUES (${imageId},${productId},${variantIdSql},${sqlStr(imageUrl)},${sqlStr(thumbnailUrl)},${isPrimary});`
        );
        imageId++;
    }
}

lines.push(`SET IDENTITY_INSERT [ProductImages] OFF;
GO
PRINT 'Inserted ${imageId - 1} ProductImages (${imageMapping.length} color groups × 3 view angles)';
GO`);

// ── Fix primary images: One primary per product (first image) ────────────────
lines.push(`
-- ============================================================
-- STEP 9: Fix IsPrimary - ensure exactly 1 primary image per product
-- ============================================================
UPDATE [ProductImages] SET [IsPrimary] = 0;
GO

UPDATE pi
SET [IsPrimary] = 1
FROM [ProductImages] pi
INNER JOIN (
    SELECT [ProductId], MIN([ImageId]) AS FirstImageId
    FROM [ProductImages]
    GROUP BY [ProductId]
) AS first ON pi.[ImageId] = first.FirstImageId;
GO

PRINT 'Fixed IsPrimary flags - one primary image per product';
GO`);

// ── Verification query ────────────────────────────────────────────────────────
lines.push(`
-- ============================================================
-- STEP 10: Verification
-- ============================================================
SELECT 'Products' AS TableName, COUNT(*) AS RowCount FROM [Products]
UNION ALL SELECT 'ProductVariants', COUNT(*) FROM [ProductVariants]
UNION ALL SELECT 'VariantAttributes', COUNT(*) FROM [VariantAttributes]
UNION ALL SELECT 'ProductImages', COUNT(*) FROM [ProductImages]
UNION ALL SELECT 'Attributes', COUNT(*) FROM [Attributes]
UNION ALL SELECT 'AttributeValues', COUNT(*) FROM [AttributeValues]
UNION ALL SELECT 'Categories', COUNT(*) FROM [Categories];
GO

PRINT '';
PRINT '============================================================';
PRINT 'Standard seed data inserted successfully!';
PRINT '============================================================';
GO
`);

// ── Write output ─────────────────────────────────────────────────────────────
const output = lines.join('\n');
fs.writeFileSync(OUTPUT_SQL, output, 'utf8');

console.log('');
console.log('✅ SQL file generated successfully!');
console.log(`📄 Output: ${OUTPUT_SQL}`);
console.log(`📊 Summary:`);
console.log(`   - Products: ${products.length}`);
console.log(`   - Variants: ${variants.length}`);
console.log(`   - VariantAttributes: ${variantAttrs.length}`);
console.log(`   - ProductImages: ${imageId - 1} (${imageMapping.length} color groups × 3 angles)`);
console.log(`   - Categories: ${categories.length}`);
console.log(`   - Attributes: ${attributes.length}`);
console.log(`   - AttributeValues: ${attrValues.length}`);
