import { httpClient } from './httpClient';

export interface CartItemResponse {
    cartItemId: number;
    cartId: number;
    variantId: number;
    quantity: number;
    variant: {
        price: number;
        sku: string;
        product: {
            name: string;
            productId: number;
            images: {
                imageUrl: string;
            }[];
        };
        variantAttributes: {
            value: {
                value: string;
                attribute: {
                    name: string;
                };
            };
        }[];
    };
}

export interface CartResponse {
    cartId: number;
    userId: number;
    items: CartItemResponse[];
}

export const fetchCart = async (): Promise<CartResponse> => {
    const response = await httpClient.get('/api/cart');
    return response.data;
};

export const addToCartApi = async (variantId: number, quantity: number): Promise<void> => {
    await httpClient.post('/api/cart/add', { variantId, quantity });
};

export const updateCartItemApi = async (cartItemId: number, quantity: number): Promise<void> => {
    await httpClient.put('/api/cart/update', { cartItemId, quantity });
};

export const removeCartItemApi = async (cartItemId: number): Promise<void> => {
    await httpClient.delete('/api/cart/remove', { data: { cartItemId } });
};
