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
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [isLoading, setIsLoading] = useState(true);

    // Ensure we have at least one image
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
        // Assumption: Data comes in as Front, Back, Side from SQL
        if (imagesArray.length === 3) {
            const temp = imagesArray[1];
            imagesArray[1] = imagesArray[2]; // Side moves to index 1
            imagesArray[2] = temp;           // Back moves to index 2
        }

        return imagesArray;
    }, [images]);

    // Safety check: ensure currentIndex is valid
    const safeIndex = currentIndex >= validImages.length ? 0 : currentIndex;
    const currentImage = validImages.length > 0 ? validImages[safeIndex] : null;

    // Reset index if out of bounds (effect for state consistency)
    useEffect(() => {
        if (currentIndex >= validImages.length && validImages.length > 0) {
            setCurrentIndex(0);
        }
    }, [validImages.length, currentIndex]);

    // Auto-play functionality
    useEffect(() => {
        if (!autoPlay || validImages.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % validImages.length);
        }, 3000);

        return () => clearInterval(interval);
    }, [autoPlay, validImages.length]);

    // Keyboard navigation
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

    const handleImageLoad = () => {
        setIsLoading(false);
    };

    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
        e.currentTarget.src = 'https://via.placeholder.com/800x1200?text=Image+Not+Available';
        setIsLoading(false);
    };

    if (validImages.length === 0) {
        return (
            <div className={`flex items-center justify-center bg-black ${className}`}>
                <div className="text-center p-12">
                    <span className="material-symbols-outlined text-6xl text-gray-600 mb-4">
                        image_not_supported
                    </span>
                    <p className="text-gray-500 text-sm">No images available</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`relative ${className}`}>
            {/* Main Image Display */}
            <div className="relative aspect-square bg-black rounded-lg overflow-hidden group">
                {/* Loading Skeleton */}
                {isLoading && (
                    <div className="absolute inset-0 bg-gradient-to-r from-black via-gray-900 to-black animate-pulse" />
                )}

                {/* Main Image */}
                <img
                    src={currentImage.imageUrl}
                    alt={`${productName} - Image ${currentIndex + 1}`}
                    className={`w-full h-full object-cover transition-all duration-500 ${isLoading ? 'opacity-0' : 'opacity-100'
                        } ${enableZoom && 'cursor-zoom-in hover:scale-105'}`}
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                    onClick={() => enableZoom && setIsZoomed(true)}
                />

                {/* View Label (if provided) */}
                {viewLabels && viewLabels[currentIndex] && (
                    <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded uppercase tracking-wider">
                        {viewLabels[currentIndex]}
                    </div>
                )}

                {/* Image Counter */}
                {validImages.length > 1 && !viewLabels && (
                    <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full">
                        {currentIndex + 1} / {validImages.length}
                    </div>
                )}

                {/* Navigation Arrows */}
                {validImages.length > 1 && (
                    <>
                        <button
                            onClick={handlePrevious}
                            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer"
                            aria-label="Previous image"
                        >
                            <span className="material-symbols-outlined">arrow_back</span>
                        </button>

                        <button
                            onClick={handleNext}
                            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer"
                            aria-label="Next image"
                        >
                            <span className="material-symbols-outlined">arrow_forward</span>
                        </button>
                    </>
                )}

                {/* Image Indicators */}
                {validImages.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                        {validImages.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentIndex(index)}
                                className={`transition-all duration-300 rounded-full cursor-pointer ${index === currentIndex
                                    ? 'w-8 h-2 bg-primary'
                                    : 'w-2 h-2 bg-white/40 hover:bg-white/60'
                                    }`}
                                aria-label={`Go to image ${index + 1}`}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Thumbnail Strip - Optimized for 3-View System */}
            {showThumbnails && validImages.length > 1 && (
                <div className="mt-4 md:mt-6 flex justify-center gap-3 md:gap-6 flex-wrap">
                    {validImages.slice(0, 3).map((image, index) => (
                        <div key={image.imageId} className="flex flex-col items-center gap-3 flex-shrink-0">
                            <button
                                onClick={() => setCurrentIndex(index)}
                                className={`w-20 h-24 sm:w-24 sm:h-28 lg:w-28 lg:h-32 rounded-lg overflow-hidden border-2 transition-all duration-200 cursor-pointer ${index === currentIndex
                                    ? 'border-primary scale-105 shadow-xl shadow-primary/40'
                                    : 'border-border-dark hover:border-white/40'
                                    }`}
                            >
                                <img
                                    src={image.thumbnailUrl || image.imageUrl}
                                    alt={`${productName} thumbnail ${index + 1}`}
                                    className="w-full h-full object-contain bg-black"
                                    loading="lazy"
                                />
                            </button>
                            {viewLabels && viewLabels[index] && (
                                <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wide transition-colors ${index === currentIndex ? 'text-primary' : 'text-gray-400'
                                    }`}>
                                    {viewLabels[index]}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Lightbox/Zoom Modal */}
            {isZoomed && (
                <div
                    className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-4 animate-fade-in"
                    onClick={() => setIsZoomed(false)}
                >
                    {/* Close Button */}
                    <button
                        onClick={() => setIsZoomed(false)}
                        className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer z-10"
                        aria-label="Close zoom view"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>

                    {/* Zoomed Image */}
                    <img
                        src={currentImage.imageUrl}
                        alt={`${productName} - Zoomed view`}
                        className="max-w-full max-h-full object-contain animate-zoom-in"
                        onClick={(e) => e.stopPropagation()}
                    />

                    {/* Navigation in Lightbox */}
                    {validImages.length > 1 && (
                        <>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handlePrevious();
                                }}
                                className="absolute left-6 w-14 h-14 flex items-center justify-center bg-white/5 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer"
                                aria-label="Previous image"
                            >
                                <span className="material-symbols-outlined text-3xl">arrow_back</span>
                            </button>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleNext();
                                }}
                                className="absolute right-6 w-14 h-14 flex items-center justify-center bg-white/5 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer"
                                aria-label="Next image"
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
