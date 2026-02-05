
import { Request, Response } from 'express';
import { getProducts, getProductById } from '../services/product.service';

export const getAllProducts = async (req: Request, res: Response) => {
    try {
        const { category, brand, search, minPrice, maxPrice } = req.query;

        const filters = {
            categorySlug: category as string,
            brandId: brand ? Number(brand) : undefined,
            search: search as string,
            minPrice: minPrice ? Number(minPrice) : undefined,
            maxPrice: maxPrice ? Number(maxPrice) : undefined,
        };

        const products = await getProducts(filters);
        res.json(products);
    } catch (error: any) {
        console.error('Get products error:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
};

export const getProduct = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid product ID' });
        }

        const product = await getProductById(id);

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json(product);
    } catch (error: any) {
        console.error('Get product by ID error:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
};
