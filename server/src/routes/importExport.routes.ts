
import { Router } from 'express';
import { downloadTemplateHandler, exportProductsHandler, importProductsHandler } from '../controllers/importExport.controller';
import { uploadExcel } from '../middleware/upload.middleware';

const router = Router();

// GET /api/products/export/template  — download empty template
router.get('/export/template', downloadTemplateHandler);

// GET /api/products/export  — export all products
router.get('/export', exportProductsHandler);

// POST /api/products/import  — import from xlsx/csv
router.post('/import', uploadExcel.single('file'), importProductsHandler);

export default router;
