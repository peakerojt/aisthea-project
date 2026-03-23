import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../middlewares/error.middleware';
import { productService } from './product.service';
import type { ProductFilter } from './product.repository';
import type { ProductQueryDto, UpdateProductStatusInput } from './product.validator';

const parseProductId = (rawId: string): number => {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, 'INVALID_ID', 'common:errors.validation');
  }
  return id;
};

const toProductFilters = (query: ProductQueryDto): ProductFilter => ({
  categorySlug: query.category,
  brandId: query.brand,
  search: query.search,
  minPrice: query.minPrice,
  maxPrice: query.maxPrice,
  status: query.status,
  sort: query.sort,
  page: query.page,
  limit: query.limit,
});

export const productController = {
  getCategories: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const categories = await productService.getCategories();
      res.json(categories);
    } catch (error) {
      next(error);
    }
  },

  getBrands: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const brands = await productService.getBrands();
      res.json(brands);
    } catch (error) {
      next(error);
    }
  },

  getAll: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query as unknown as ProductQueryDto;
      const result = await productService.getProducts(toProductFilters(query));
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  getOne: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseProductId(req.params.id as string);
      const product = await productService.getProductById(id);
      res.json(product);
    } catch (error) {
      next(error);
    }
  },

  getForEdit: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseProductId(req.params.id as string);
      const product = await productService.getProductForEdit(id);
      res.json(product);
    } catch (error) {
      next(error);
    }
  },

  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await productService.createProduct(req.body);
      res.status(201).json({ success: true, code: 'PRODUCT_CREATED', data: result });
    } catch (error) {
      next(error);
    }
  },

  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseProductId(req.params.id as string);
      const result = await productService.updateProduct(id, req.body);
      res.json({ success: true, code: 'PRODUCT_UPDATED', data: result });
    } catch (error) {
      next(error);
    }
  },

  updateStatus: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseProductId(req.params.id as string);
      const { status } = req.body as UpdateProductStatusInput;
      const result = await productService.updateProductStatus(id, status);
      res.json({ success: true, code: 'PRODUCT_STATUS_UPDATED', data: result });
    } catch (error) {
      next(error);
    }
  },

  delete: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseProductId(req.params.id as string);
      const result = await productService.deleteProduct(id);
      res.json({
        success: true,
        code: result.mode === 'archived' ? 'PRODUCT_ARCHIVED' : 'PRODUCT_DELETED',
        mode: result.mode,
        ...(typeof result.deletedImageCount === 'number' ? { deletedImageCount: result.deletedImageCount } : {}),
      });
    } catch (error) {
      next(error);
    }
  },
};
