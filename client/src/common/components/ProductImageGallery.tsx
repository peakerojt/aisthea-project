import React, { useEffect, useMemo, useState } from 'react';

import { ProductImageLightbox } from '@/common/components/ProductImageLightbox';
import { getCloudinaryFullSize, getCloudinaryThumbnail } from '@/common/utils/cloudinary';

export interface ProductImage {
    imageId?: number;
    imageUrl: string;
    thumbnailUrl?: string;
    isPrimary?: boolean;
}

interface ProductImageGalleryProps {
    images?: ProductImage[];
    productName: string;
    className?: string;
    enableZoom?: boolean;
    autoPlay?: boolean;
    showThumbnails?: boolean;
    viewLabels?: string[]; // e.g. ['FRONT VIEW', 'SIDE VIEW', 'BACK VIEW']
}

export const ProductImageGallery: React.FC<ProductImageGalleryProps> = ({
    images = [],
    productName,
    className = '',
    enableZoom = true,
    autoPlay = false,
    showThumbnails = true,
    viewLabels
}) => {
    const [galleryIndex, setGalleryIndex] = useState(0);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [isZoomed, setIsZoomed] = useState(false);
    // Track which URLs have already been loaded so we skip the skeleton on revisit
    const [loadedUrls, setLoadedUrls] = useState<Set<string>>(new Set());

    // Filter valid images and deduplicate based on URL
    const validImages = useMemo(() => {
        if (!images || images.length === 0) return [];

        const uniqueImages = new Map<string, ProductImage>();

        images.forEach(img => {
            if (img && img.imageUrl) {
                const url = img.imageUrl;
                if (!uniqueImages.has(url)) {
                    uniqueImages.set(url, img);
                }
            }
        });

        const imagesArray = Array.from(uniqueImages.values()).slice(0, 3);

        // Reorder to: Front, Side, Back (swap index 1 and 2 if 3 images exist)
        if (imagesArray.length === 3) {
            const temp = imagesArray[1];
            imagesArray[1] = imagesArray[2]; // Side moves to index 1
            imagesArray[2] = temp;           // Back moves to index 2
        }

        return imagesArray;
    }, [images]);

    const safeGalleryIndex = galleryIndex >= validImages.length ? 0 : galleryIndex;
    const currentImage = validImages.length > 0 ? validImages[safeGalleryIndex] : null;
    const currentImageSrc = currentImage?.imageUrl
        ? getCloudinaryFullSize(currentImage.imageUrl)
        : '';

    useEffect(() => {
        if (galleryIndex >= validImages.length && validImages.length > 0) {
            setGalleryIndex(0);
        }
    }, [galleryIndex, validImages.length]);

    useEffect(() => {
        if (lightboxIndex >= validImages.length && validImages.length > 0) {
            setLightboxIndex(0);
        }
    }, [lightboxIndex, validImages.length]);

    // Reset index to 0 when images reference changes (e.g., when switching colors)
    useEffect(() => {
        setGalleryIndex(0);
        setLightboxIndex(0);
        setIsZoomed(false);
    }, [images]);

    useEffect(() => {
        if (!autoPlay || validImages.length <= 1 || isZoomed) return;
        const interval = setInterval(() => {
            setGalleryIndex((prev) => (prev + 1) % validImages.length);
        }, 4000);
        return () => clearInterval(interval);
    }, [autoPlay, isZoomed, validImages.length]);

    const handleGalleryNext = () => {
        if (validImages.length > 0) {
            setGalleryIndex((prev) => (prev + 1) % validImages.length);
        }
    };

    const handleGalleryPrevious = () => {
        if (validImages.length > 0) {
            setGalleryIndex((prev) => (prev - 1 + validImages.length) % validImages.length);
        }
    };

    const openLightbox = () => {
        if (!enableZoom || validImages.length === 0) return;
        setLightboxIndex(safeGalleryIndex);
        setIsZoomed(true);
    };

    const handleImageLoad = (url: string) => {
        setLoadedUrls(prev => new Set(prev).add(url));
    };

    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>, url: string) => {
        e.currentTarget.src = 'https://via.placeholder.com/800x1200?text=Image+Not+Available';
        setLoadedUrls(prev => new Set(prev).add(url));
    };

    if (validImages.length === 0 || !currentImage) {
        return (
            <div className={`flex items-center justify-center bg-black rounded-lg ${className} aspect-[4/5] md:aspect-square`}>
                <div className="text-center p-8">
                    <span className="material-symbols-outlined text-4xl text-gray-600 mb-2">image_not_supported</span>
                    <p className="text-gray-500 text-xs">Không có hình ảnh</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`relative ${className} flex flex-col items-center w-full`}>
            {/* Main Image Display - Shorter aspect ratio to fit everything */}
            <div className="relative w-full aspect-[4/3] md:aspect-[4/4] bg-black rounded-lg overflow-hidden group">
                {/* Loading Skeleton — only shown when URL hasn't been loaded yet */}
                {!loadedUrls.has(currentImageSrc) && (
                    <div className="absolute inset-0 bg-gradient-to-r from-black via-gray-900 to-black animate-pulse" />
                )}

                <img
                    key={currentImageSrc}
                    src={currentImageSrc}
                    alt={`${productName} - Image ${safeGalleryIndex + 1}`}
                    className={`w-full h-full object-contain transition-opacity duration-300 ${loadedUrls.has(currentImageSrc) ? 'opacity-100' : 'opacity-0'
                        } ${enableZoom && 'cursor-zoom-in'}`}
                    onLoad={() => handleImageLoad(currentImageSrc)}
                    onError={(e) => handleImageError(e, currentImageSrc)}
                    onClick={openLightbox}
                />

                {/* View Label */}
                {viewLabels && viewLabels[safeGalleryIndex] && (
                    <div className="absolute top-4 right-4 z-20 rounded bg-black/70 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md">
                        {viewLabels[safeGalleryIndex]}
                    </div>
                )}

                {/* Navigation Arrows */}
                {validImages.length > 1 && (
                    <>
                        <button
                            onClick={handleGalleryPrevious}
                            className="absolute left-4 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-all duration-300 group-hover:opacity-100 hover:bg-black/60 backdrop-blur-sm cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-xl">arrow_back</span>
                        </button>
                        <button
                            onClick={handleGalleryNext}
                            className="absolute right-4 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-all duration-300 group-hover:opacity-100 hover:bg-black/60 backdrop-blur-sm cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-xl">arrow_forward</span>
                        </button>
                    </>
                )}

                {/* Thumbnail Overlay - Bottom Right (Horizontal) */}
                {showThumbnails && validImages.length > 1 && (
                    <div className="absolute bottom-6 right-6 flex flex-row gap-3 pointer-events-auto z-20">
                        {validImages.slice(0, 3).map((image, index) => (
                            <button
                                key={image.imageId || index}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setGalleryIndex(index);
                                }}
                                className={`h-12 w-12 cursor-pointer overflow-hidden rounded-md border-2 transition-all duration-300 ease-out sm:h-16 sm:w-16 ${index === safeGalleryIndex
                                    ? 'border-primary scale-110 shadow-lg shadow-black/50'
                                    : 'border-white/20 bg-black/20 opacity-70 hover:border-white/50 hover:opacity-100'
                                    }`}
                            >
                                <img
                                    src={getCloudinaryThumbnail(image.thumbnailUrl || image.imageUrl)}
                                    alt={`${productName} thumbnail ${index + 1}`}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <ProductImageLightbox
                isOpen={isZoomed}
                images={validImages}
                currentIndex={lightboxIndex}
                onIndexChange={setLightboxIndex}
                onClose={() => setIsZoomed(false)}
                productName={productName}
                viewLabels={viewLabels}
            />
        </div>
    );
};
