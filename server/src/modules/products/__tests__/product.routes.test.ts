import express from 'express';
import request from 'supertest';

const productController = {
  getCategories: jest.fn((_req, res) => res.json({ route: 'categories' })),
  getBrands: jest.fn((_req, res) => res.json({ route: 'brands' })),
  getAll: jest.fn((_req, res) => res.json({ route: 'products' })),
  getForEdit: jest.fn((_req, res) => res.json({ route: 'edit' })),
  getOne: jest.fn((_req, res) => res.json({ route: 'detail' })),
  create: jest.fn((_req, res) => res.status(201).json({ route: 'create' })),
  update: jest.fn((_req, res) => res.json({ route: 'update' })),
  updateStatus: jest.fn((_req, res) => res.json({ route: 'update-status' })),
  delete: jest.fn((_req, res) => res.json({ route: 'delete' })),
};

const productMediaController = {
  getProductImages: jest.fn((_req, res) => res.json({ route: 'images' })),
  uploadSingleProductImage: jest.fn((_req, res) => res.status(201).json({ route: 'upload-single' })),
  uploadMultipleProductImages: jest.fn((_req, res) => res.status(201).json({ route: 'upload-multiple' })),
  bulkUploadProductImages: jest.fn((_req, res) => res.status(201).json({ route: 'upload-bulk' })),
  setPrimaryImage: jest.fn((_req, res) => res.json({ route: 'set-primary' })),
  deleteProductImage: jest.fn((_req, res) => res.json({ route: 'delete-image' })),
};

jest.mock('../product.controller', () => ({ productController }));
jest.mock('../product-media.controller', () => ({ productMediaController }));
jest.mock('../../../middlewares/auth.middleware', () => ({
  authenticateToken: (_req: unknown, _res: unknown, next: () => void) => next(),
  requirePermission: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));
jest.mock('../../../middlewares/validate.middleware', () => ({
  validate: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));
jest.mock('../../../middlewares/cache.middleware', () => ({
  cacheMiddleware: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  invalidateCache: jest.fn(),
  CACHE_TTL: { CATEGORIES: 1, BRANDS: 1, PRODUCTS: 1 },
}));
jest.mock('../../../middlewares/upload.middleware', () => ({
  upload: {
    single: () => (_req: unknown, _res: unknown, next: () => void) => next(),
    array: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  },
}));

import productRoutes from '../product.routes';

describe('product module routes', () => {
  const app = express();
  app.use(express.json());
  app.use(productRoutes);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps meta category route owned by the product module', async () => {
    const response = await request(app).get('/meta/categories');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'categories' });
    expect(productController.getCategories).toHaveBeenCalledTimes(1);
  });

  it('keeps product image listing on the module media controller', async () => {
    const response = await request(app).get('/42/images');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'images' });
    expect(productMediaController.getProductImages).toHaveBeenCalledTimes(1);
  });

  it('keeps primary-image updates on the module media controller', async () => {
    const response = await request(app).patch('/42/images/5/primary');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'set-primary' });
    expect(productMediaController.setPrimaryImage).toHaveBeenCalledTimes(1);
  });

  it('still resolves product detail after the image-specific routes', async () => {
    const response = await request(app).get('/42');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'detail' });
    expect(productController.getOne).toHaveBeenCalledTimes(1);
  });
});
