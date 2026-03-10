import { Router } from 'express';
import {
    downloadTemplateHandler,
    exportProductsHandler,
    importProductsHandler,
} from '../../controllers/importExport.controller';
import { authenticateToken, checkRole } from '../../middlewares/auth.middleware';
import { uploadExcel } from '../../middlewares/upload.middleware';

const router = Router();

const adminGuard = [authenticateToken, checkRole(['Admin', 'Super Admin'])];

// GET  /api/products/export/template   — download blank Excel template
router.get('/export/template', ...adminGuard, downloadTemplateHandler);

// GET  /api/products/export            — export all products as xlsx
router.get('/export', ...adminGuard, exportProductsHandler);

// POST /api/products/import            — import from xlsx/csv (Admin)
router.post('/import', ...adminGuard, uploadExcel.single('file'), importProductsHandler);

export default router;
