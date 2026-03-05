import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '../contexts/CartContext';

interface CartBadgeProps {
    onClick: () => void;
    className?: string;
}

/**
 * CartBadge — biểu tượng giỏ hàng với số lượng sản phẩm.
 * Dùng trong Header/Navbar để mở CartDrawer.
 */
export const CartBadge: React.FC<CartBadgeProps> = ({ onClick, className = '' }) => {
    const { totalItems } = useCart();

    return (
        <button
            id="cart-badge"
            onClick={onClick}
            aria-label={`Giỏ hàng${totalItems > 0 ? ` (${totalItems} sản phẩm)` : ''}`}
            className={`relative p-2 text-gray-400 hover:text-white transition-colors cursor-pointer group ${className}`}
        >
            <ShoppingBag
                size={22}
                className="transition-transform group-hover:scale-110 duration-150"
            />
            {totalItems > 0 && (
                <span
                    className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-[3px]
                        bg-primary text-white text-[10px] font-black rounded-full
                        flex items-center justify-center
                        animate-in zoom-in-50 duration-200"
                >
                    {totalItems > 99 ? '99+' : totalItems}
                </span>
            )}
        </button>
    );
};
