import React from 'react';
import { Package } from 'lucide-react';
import { TopProduct } from '@/common/services/dashboard.service';

interface TopProductsProps {
    products: TopProduct[];
    isLoading: boolean;
}

const CLOUDINARY_THUMB = 'w_80,h_80,c_fill,f_auto,q_auto:good';

function optimizeImage(url: string | null): string | null {
    if (!url) return null;
    return url.replace('/upload/', `/upload/${CLOUDINARY_THUMB}/`);
}

const SkeletonRow: React.FC = () => (
    <div className="flex items-center gap-3 py-3 animate-pulse">
        <div className="w-10 h-10 rounded-lg bg-white/10 shrink-0" />
        <div className="flex-1">
            <div className="h-3 bg-white/10 rounded w-3/4 mb-2" />
            <div className="h-2.5 bg-white/10 rounded w-1/3" />
        </div>
        <div className="h-3 bg-white/10 rounded w-8" />
    </div>
);

export const TopProducts: React.FC<TopProductsProps> = ({ products, isLoading }) => {
    return (
        <div className="bg-surface-dark border border-white/5 rounded-lg p-6 flex flex-col h-full">
            {/* Header */}
            <div className="mb-5">
                <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    Sản phẩm bán chạy nhất
                </h3>
                <p className="text-xs text-white/30 mt-1">Top 5 trong kỳ</p>
            </div>

            {/* List */}
            <div className="flex-1 divide-y divide-white/5">
                {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                ) : products.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-white/20 text-sm py-12">
                        Chưa có dữ liệu
                    </div>
                ) : (
                    products.map((product, index) => {
                        const thumb = optimizeImage(product.imageUrl);
                        return (
                            <div key={product.productId} className="flex items-center gap-3 py-3 group">
                                {/* Rank */}
                                <span className="text-xs font-bold text-white/20 w-4 shrink-0 text-right">
                                    {index + 1}
                                </span>

                                {/* Image */}
                                <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                                    {thumb ? (
                                        <img
                                            src={thumb}
                                            alt={product.name}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <Package className="w-4 h-4 text-white/20" />
                                    )}
                                </div>

                                {/* Name */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-white/80 truncate group-hover:text-white transition-colors">
                                        {product.name}
                                    </p>
                                    <p className="text-[10px] text-white/30 mt-0.5">
                                        {product.totalSold.toLocaleString('vi-VN')} đã bán
                                    </p>
                                </div>

                                {/* Bar indicator */}
                                <div className="w-16 shrink-0">
                                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary rounded-full"
                                            style={{
                                                width: `${Math.min(
                                                    100,
                                                    (product.totalSold / (products[0]?.totalSold || 1)) * 100
                                                )}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
