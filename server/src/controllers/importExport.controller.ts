
import { Request, Response } from 'express';
import { generateTemplate, exportProducts, importProducts } from '../services/importExport.service';
import { logger } from '../lib/logger';

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
    } catch (error) {
        logger.error('[importExportController] downloadTemplateHandler failed', { error });
        res.status(500).json({ success: false, errorCode: 'PRODUCT_TEMPLATE_DOWNLOAD_FAILED' });
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
    } catch (error) {
        logger.error('[importExportController] exportProductsHandler failed', { error });
        res.status(500).json({ success: false, errorCode: 'PRODUCT_EXPORT_FAILED' });
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
            return res.status(400).json({ success: false, errorCode: 'PRODUCT_IMPORT_FILE_REQUIRED' });
        }

        const report = await importProducts(req.file.buffer);
        res.json(report);
    } catch (error) {
        logger.error('[importExportController] importProductsHandler failed', { error });
        res.status(500).json({ success: false, errorCode: 'PRODUCT_IMPORT_FAILED' });
    }
};
