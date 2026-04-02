import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getCloudinaryProductCard } from '@/common/utils/cloudinary';
import { useTranslation } from 'react-i18next';

export interface ProductCardImage {
    imageUrl: string;
    thumbnailUrl?: string;
}

interface ProductCardProps {
    id: string;
    name: string;
    price: number;
    image: string; // Primary image (backward compatible)
    images?: ProductCardImage[]; // Multiple images for hover preview
    category?: string;
    status?: string;
    onClick?: () => void;
    className?: string;
    showHoverGallery?: boolean;
    variant?: 'default' | 'editorial';
}

export const ProductCard: React.FC<ProductCardProps> = ({
    id,
    name,
    price,
    image,
    images = [],
    category,
    status,
    onClick,
    className = '',
    showHoverGallery = true,
    variant = 'default',
}) => {
    const { t } = useTranslation(['pages', 'products']);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isHovering, setIsHovering] = useState(false);
    const [imgLoaded, setImgLoaded] = useState(false);
    const [canUseHoverGallery, setCanUseHoverGallery] = useState(false);
    const hoverFrameRef = useRef<number | null>(null);
    const pendingImageIndexRef = useRef<number | null>(null);
    const currentImageIndexRef = useRef(0);

    const displayStatus = useMemo(() => {
        if (status === 'In Stock') return t('products:status.inStock');
        if (status === 'Low Stock') return t('products:status.lowStock');
        if (status === 'Out of Stock') return t('products:status.outOfStock');
        return status;
    }, [status, t]);

    const imageList = useMemo(
        () => (images.length > 0 ? images : [{ imageUrl: image, thumbnailUrl: image }]),
        [image, images]
    );

    const currentImage = imageList[currentImageIndex] ?? imageList[0];
    const hasMultipleImages = imageList.length > 1;
    const isEditorial = variant === 'editorial';
    const canRenderHoverGallery = showHoverGallery && hasMultipleImages && canUseHoverGallery;

    const optimizedImageUrl = useMemo(
        () => getCloudinaryProductCard(currentImage.thumbnailUrl || currentImage.imageUrl),
        [currentImage]
    );

    useEffect(() => {
        currentImageIndexRef.current = currentImageIndex;
    }, [currentImageIndex]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }

        const mediaQuery = window.matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)');
        const updateHoverCapability = () => {
            setCanUseHoverGallery(mediaQuery.matches);
        };

        updateHoverCapability();
        mediaQuery.addEventListener('change', updateHoverCapability);

        return () => {
            mediaQuery.removeEventListener('change', updateHoverCapability);
        };
    }, []);

    useEffect(() => {
        return () => {
            if (hoverFrameRef.current !== null) {
                window.cancelAnimationFrame(hoverFrameRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (!canRenderHoverGallery) {
            if (hoverFrameRef.current !== null) {
                window.cancelAnimationFrame(hoverFrameRef.current);
                hoverFrameRef.current = null;
            }
            pendingImageIndexRef.current = null;
            setIsHovering(false);
            setCurrentImageIndex(0);
        }
    }, [canRenderHoverGallery]);

    useEffect(() => {
        if (currentImageIndex > imageList.length - 1) {
            setCurrentImageIndex(0);
        }
    }, [currentImageIndex, imageList.length]);

    const preloadNextImage = () => {
        if (hasMultipleImages && currentImageIndex < imageList.length - 1) {
            const nextImage = imageList[currentImageIndex + 1];
            const img = new Image();
            img.src = getCloudinaryProductCard(nextImage.thumbnailUrl || nextImage.imageUrl);
        }
    };

    const handleMouseEnter = () => {
        if (!canRenderHoverGallery) {
            return;
        }

        setIsHovering(true);
        preloadNextImage();
    };

    const handleMouseLeave = () => {
        if (hoverFrameRef.current !== null) {
            window.cancelAnimationFrame(hoverFrameRef.current);
            hoverFrameRef.current = null;
        }

        pendingImageIndexRef.current = null;
        setIsHovering(false);
        setCurrentImageIndex(0); // Reset to first image
    };

    const handleHoverImageMove = (event: React.MouseEvent<HTMLDivElement>) => {
        if (!canRenderHoverGallery) {
            return;
        }

        const rect = event.currentTarget.getBoundingClientRect();
        const sectionWidth = rect.width / imageList.length;
        if (sectionWidth <= 0) {
            return;
        }

        const x = event.clientX - rect.left;
        const nextIndex = Math.min(
            Math.max(Math.floor(x / sectionWidth), 0),
            imageList.length - 1
        );

        if (
            nextIndex === currentImageIndexRef.current ||
            nextIndex === pendingImageIndexRef.current
        ) {
            return;
        }

        pendingImageIndexRef.current = nextIndex;

        if (hoverFrameRef.current !== null) {
            window.cancelAnimationFrame(hoverFrameRef.current);
        }

        hoverFrameRef.current = window.requestAnimationFrame(() => {
            hoverFrameRef.current = null;

            const scheduledIndex = pendingImageIndexRef.current;
            pendingImageIndexRef.current = null;

            if (
                typeof scheduledIndex === 'number' &&
                scheduledIndex !== currentImageIndexRef.current
            ) {
                setCurrentImageIndex(scheduledIndex);
            }
        });
    };

    return (
        <div
            className={`group flex flex-col gap-4 cursor-pointer ${isEditorial ? 'rounded-[24px]' : ''} ${className}`}
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onClick) onClick();
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Image Container */}
            <div className={`relative aspect-square overflow-hidden bg-[#f0f0ee] ${isEditorial ? 'rounded-[24px]' : 'rounded-sm'}`}>
                {/* Skeleton shimmer while loading */}
                {!imgLoaded && (
                    <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-white/10 to-white/5 animate-pulse" />
                )}
                {/* Main Image */}
                <img
                    src={optimizedImageUrl}
                    alt={name}
                    loading="lazy"
                    onLoad={() => setImgLoaded(true)}
                    onError={(e) => {
                        e.currentTarget.src = 'https://via.placeholder.com/400x600?text=Khong+co+anh';
                        setImgLoaded(true);
                    }}
                    className={`w-full h-full object-cover transition-all duration-700 ${isEditorial ? 'group-hover:scale-[1.02]' : 'group-hover:scale-105'} ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                />

                {/* Hover Overlay */}
                <div className={`absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${isEditorial ? 'bg-black/10' : 'bg-black/20'}`} />

                {/* Quick View Button */}
                <div className="absolute bottom-4 left-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                    <span className="bg-white text-black text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 shadow-lg">
                        {t('pages:collection.quickView')}
                    </span>
                </div>

                {/* Image Counter (top-right) */}
                {canRenderHoverGallery && (
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-full">
                            {currentImageIndex + 1}/{imageList.length}
                        </div>
                    </div>
                )}

                {/* Image Cycling on Hover (Bottom Indicators) */}
                {canRenderHoverGallery && isHovering && (
                    <div className="absolute bottom-4 right-4 flex gap-1.5">
                        {imageList.map((_, index) => (
                            <button
                                key={index}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentImageIndex(index);
                                }}
                                className={`transition-all duration-200 rounded-full ${index === currentImageIndex
                                    ? 'w-6 h-1.5 bg-primary'
                                    : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/80'
                                    }`}
                                aria-label={`Xem ảnh ${index + 1}`}
                            />
                        ))}
                    </div>
                )}

                {/* Status Badge (if available) */}
                {status && status !== 'In Stock' && (
                    <div className="absolute top-4 left-4">
                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${status === 'Low Stock'
                            ? 'bg-yellow-500/90 text-black'
                            : status === 'Out of Stock'
                                ? 'bg-red-500/90 text-white'
                                : 'bg-green-500/90 text-white'
                            }`}>
                            {displayStatus}
                        </span>
                    </div>
                )}

                {/* Hover Image Cycle Trigger */}
                {canRenderHoverGallery && isHovering && (
                    <div
                        className="absolute inset-0 cursor-pointer"
                        onMouseMove={handleHoverImageMove}
                    />
                )}
            </div>

            {/* Product Info */}
            <div className={`${isEditorial ? 'py-3' : 'py-4'}`}>
                <h3 className={`line-clamp-2 text-white transition-all duration-300 ${isEditorial
                    ? 'text-lg font-semibold tracking-[0.01em] group-hover:text-white'
                    : 'text-lg font-bold uppercase tracking-wide group-hover:text-primary'
                    }`}>
                    {name}
                </h3>
                <div className={`mt-2 flex items-baseline gap-2 ${isEditorial ? 'text-sm' : ''}`}>
                    <p className={`${isEditorial ? 'text-[15px] font-semibold text-white' : 'text-base font-bold text-white'}`}>{new Intl.NumberFormat('vi-VN').format(price)}đ</p>
                    {category && (
                        <>
                            <span className={`${isEditorial ? 'text-white/40' : 'text-gray-500'}`}>•</span>
                            <p className={`${isEditorial ? 'text-[11px] text-white/55' : 'text-xs text-gray-300 uppercase'}`}>{category}</p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
