import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Share2, ZoomIn } from 'lucide-react';

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
    const [currentIndex, setCurrentIndex] = useState(0);
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

    const safeIndex = currentIndex >= validImages.length ? 0 : currentIndex;
    const currentImage = validImages.length > 0 ? validImages[safeIndex] : null;

    useEffect(() => {
        if (currentIndex >= validImages.length && validImages.length > 0) {
            setCurrentIndex(0);
        }
    }, [validImages.length, currentIndex]);

    // Reset index to 0 when images reference changes (e.g., when switching colors)
    useEffect(() => {
        setCurrentIndex(0);
    }, [images]);

    useEffect(() => {
        if (!autoPlay || validImages.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % validImages.length);
        }, 4000);
        return () => clearInterval(interval);
    }, [autoPlay, validImages.length]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isZoomed) {
                if (e.key === 'Escape') setIsZoomed(false);
                if (e.key === 'ArrowLeft') handlePrevious();
                if (e.key === 'ArrowRight') handleNext();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isZoomed]);

    const handleNext = () => {
        if (validImages.length > 0) {
            setCurrentIndex((prev) => (prev + 1) % validImages.length);
        }
    };

    const handlePrevious = () => {
        if (validImages.length > 0) {
            setCurrentIndex((prev) => (prev - 1 + validImages.length) % validImages.length);
        }
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
                {!loadedUrls.has(currentImage.imageUrl) && (
                    <div className="absolute inset-0 bg-gradient-to-r from-black via-gray-900 to-black animate-pulse" />
                )}

                <img
                    key={currentImage.imageUrl}
                    src={currentImage.imageUrl}
                    alt={`${productName} - Image ${currentIndex + 1}`}
                    className={`w-full h-full object-contain transition-opacity duration-300 ${loadedUrls.has(currentImage.imageUrl) ? 'opacity-100' : 'opacity-0'
                        } ${enableZoom && 'cursor-zoom-in'}`}
                    onLoad={() => handleImageLoad(currentImage.imageUrl)}
                    onError={(e) => handleImageError(e, currentImage.imageUrl)}
                    onClick={() => enableZoom && setIsZoomed(true)}
                />

                {/* View Label */}
                {viewLabels && viewLabels[currentIndex] && (
                    <div className="absolute top-4 right-4 z-20 rounded bg-black/70 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md">
                        {viewLabels[currentIndex]}
                    </div>
                )}

                {/* Navigation Arrows */}
                {validImages.length > 1 && (
                    <>
                        <button
                            onClick={handlePrevious}
                            className="absolute left-4 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-all duration-300 group-hover:opacity-100 hover:bg-black/60 backdrop-blur-sm cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-xl">arrow_back</span>
                        </button>
                        <button
                            onClick={handleNext}
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
                                    setCurrentIndex(index);
                                }}
                                className={`h-12 w-12 cursor-pointer overflow-hidden rounded-md border-2 transition-all duration-300 ease-out sm:h-16 sm:w-16 ${index === currentIndex
                                    ? 'border-primary scale-110 shadow-lg shadow-black/50'
                                    : 'border-white/20 bg-black/20 opacity-70 hover:border-white/50 hover:opacity-100'
                                    }`}
                            >
                                <img
                                    src={image.thumbnailUrl || image.imageUrl}
                                    alt={`${productName} thumbnail ${index + 1}`}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                />
                            </button>
                        ))}
                    </div>
                )}
            </div>


            {/* Lightbox */}
            {isZoomed && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={`${productName} image viewer`}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/92 p-4 animate-fade-in"
                    onClick={() => setIsZoomed(false)}
                >
                    <button
                        onClick={() => setIsZoomed(false)}
                        className="absolute right-6 top-6 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors duration-200 hover:bg-white/20 cursor-pointer"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                    <div
                        className="flex max-w-[96vw] flex-col gap-3 rounded-2xl border border-gray-200/10 bg-[#0B0B0C] p-4 shadow-2xl shadow-black/40 animate-fade-in"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={currentImage.imageUrl}
                            alt={`${productName} - Zoomed`}
                            className="max-h-[78vh] max-w-full object-contain"
                        />
                    </div>
                    {validImages.length > 1 && (
                        <>
                            <button
                                onClick={(e) => { e.stopPropagation(); handlePrevious(); }}
                                className="absolute left-6 flex h-14 w-14 items-center justify-center rounded-full bg-white/5 text-white transition-colors duration-200 hover:bg-white/20 cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-3xl">arrow_back</span>
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                                className="absolute right-6 flex h-14 w-14 items-center justify-center rounded-full bg-white/5 text-white transition-colors duration-200 hover:bg-white/20 cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-3xl">arrow_forward</span>
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};
