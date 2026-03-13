import React, { useState } from 'react';
import { getCloudinaryProductCard } from '../../utils/cloudinary';

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
    showHoverGallery = true
}) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isHovering, setIsHovering] = useState(false);
    const [imgLoaded, setImgLoaded] = useState(false);

    // Use images array if available, otherwise fall back to single image
    const imageList = images.length > 0
        ? images
        : [{ imageUrl: image, thumbnailUrl: image }];

    const currentImage = imageList[currentImageIndex];
    const hasMultipleImages = imageList.length > 1;

    // Optimize image URL for Retina displays (600x800 for 300x400 CSS)
    const optimizedImageUrl = getCloudinaryProductCard(
        currentImage.thumbnailUrl || currentImage.imageUrl
    );

    // Preload next image on hover
    const preloadNextImage = () => {
        if (hasMultipleImages && currentImageIndex < imageList.length - 1) {
            const nextImage = imageList[currentImageIndex + 1];
            const img = new Image();
            img.src = getCloudinaryProductCard(nextImage.thumbnailUrl || nextImage.imageUrl);
        }
    };

    const handleMouseEnter = () => {
        setIsHovering(true);
        if (showHoverGallery && hasMultipleImages) {
            preloadNextImage();
        }
    };

    const handleMouseLeave = () => {
        setIsHovering(false);
        setCurrentImageIndex(0); // Reset to first image
    };

    const handleImageCycle = () => {
        if (hasMultipleImages && showHoverGallery) {
            setCurrentImageIndex((prev) => (prev + 1) % imageList.length);
            preloadNextImage();
        }
    };

    return (
        <div
            className={`group cursor-pointer flex flex-col gap-4 ${className}`}
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onClick) onClick();
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Image Container */}
            <div className="relative aspect-square overflow-hidden bg-[#f0f0ee] rounded-sm">
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
                        e.currentTarget.src = 'https://via.placeholder.com/400x600?text=No+Image';
                        setImgLoaded(true);
                    }}
                    className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-105 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                />

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Quick View Button */}
                <div className="absolute bottom-4 left-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                    <span className="bg-white text-black text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 shadow-lg">
                        Quick View
                    </span>
                </div>

                {/* Image Counter (top-right) */}
                {hasMultipleImages && showHoverGallery && (
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-full">
                            {currentImageIndex + 1}/{imageList.length}
                        </div>
                    </div>
                )}

                {/* Image Cycling on Hover (Bottom Indicators) */}
                {hasMultipleImages && showHoverGallery && isHovering && (
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
                                aria-label={`View image ${index + 1}`}
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
                            {status}
                        </span>
                    </div>
                )}

                {/* Hover Image Cycle Trigger */}
                {hasMultipleImages && showHoverGallery && isHovering && (
                    <div
                        className="absolute inset-0 cursor-pointer"
                        onMouseMove={(e) => {
                            // Cycle image on mouse move (simple auto-advance on hover)
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = e.clientX - rect.left;
                            const sectionWidth = rect.width / imageList.length;
                            const newIndex = Math.min(
                                Math.floor(x / sectionWidth),
                                imageList.length - 1
                            );
                            if (newIndex !== currentImageIndex) {
                                setCurrentImageIndex(newIndex);
                            }
                        }}
                    />
                )}
            </div>

            {/* Product Info */}
            <div className="py-4">
                <h3 className="text-lg font-bold uppercase tracking-wide text-white group-hover:text-primary transition-colors line-clamp-2">
                    {name}
                </h3>
                <div className="flex items-baseline gap-2 mt-2">
                    <p className="text-base font-bold text-white">{new Intl.NumberFormat('vi-VN').format(price)}đ</p>
                    {category && (
                        <>
                            <span className="text-gray-500">•</span>
                            <p className="text-xs text-gray-300 uppercase">{category}</p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
