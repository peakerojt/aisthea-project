
import { Request, Response } from 'express';
import { generateTemplate, exportProducts, importProducts } from '../services/importExport.service';

/**
 * GET /api/products/export/template
 * Returns an empty styled Excel template for users to fill out
 */
export const downloadTemplateHandler = async (_req: Request, res: Response) => {
    try {
        const buffer = await generateTemplate();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="template_san_pham.xlsx"');
        res.setHeader('Content-Length', buffer.length);
        res.send(buffer);
    } catch (error: any) {
        console.error('[Template] Error:', error);
        res.status(500).json({ error: 'Không thể tạo file template. Vui lòng thử lại.' });
    }
};

/**
 * GET /api/products/export
 * Exports all products + variants as a flat Excel file
 */
export const exportProductsHandler = async (_req: Request, res: Response) => {
    try {
        const buffer = await exportProducts();
        const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="san_pham_${timestamp}.xlsx"`);
        res.setHeader('Content-Length', buffer.length);
        res.send(buffer);
    } catch (error: any) {
        console.error('[Export] Error:', error);
        res.status(500).json({ error: 'Không thể xuất sản phẩm. Vui lòng thử lại.' });
    }
};

/**
 * POST /api/products/import
 * Accepts an xlsx/csv file and upserts products/variants
 * Always returns 200 with a detailed report (errors inside body)
 */
export const importProductsHandler = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Vui lòng tải lên file Excel (.xlsx) hoặc CSV (.csv)' });
        }

        const report = await importProducts(req.file.buffer);
        res.json(report);
    } catch (error: any) {
        console.error('[Import] Error:', error);
        res.status(500).json({ error: 'Lỗi xử lý file nhập. Vui lòng kiểm tra định dạng file.' });
    }
};
