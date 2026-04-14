import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import type { ProductImage } from '@/common/components/ProductImageGallery';
import { getCloudinaryFullSize } from '@/common/utils/cloudinary';

interface ProductImageLightboxProps {
    isOpen: boolean;
    images: ProductImage[];
    currentIndex: number;
    onIndexChange: (index: number) => void;
    onClose: () => void;
    productName: string;
    viewLabels?: string[];
}

export const ProductImageLightbox: React.FC<ProductImageLightboxProps> = ({
    isOpen,
    images,
    currentIndex,
    onIndexChange,
    onClose,
    productName,
    viewLabels,
}) => {
    const [isVisible, setIsVisible] = useState(false);

    const safeIndex = useMemo(() => {
        if (images.length === 0) return 0;
        if (currentIndex < 0 || currentIndex >= images.length) return 0;
        return currentIndex;
    }, [currentIndex, images.length]);

    const currentImage = images[safeIndex];
    const currentImageSrc = useMemo(
        () => (currentImage ? getCloudinaryFullSize(currentImage.imageUrl) : ''),
        [currentImage],
    );

    useEffect(() => {
        if (!isOpen || typeof document === 'undefined') return undefined;

        const { body, documentElement } = document;
        const previousBodyOverflow = body.style.overflow;
        const previousDocumentOverflow = documentElement.style.overflow;

        body.style.overflow = 'hidden';
        documentElement.style.overflow = 'hidden';

        return () => {
            body.style.overflow = previousBodyOverflow;
            documentElement.style.overflow = previousDocumentOverflow;
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) {
            setIsVisible(false);
            return undefined;
        }

        const frameId = window.requestAnimationFrame(() => setIsVisible(true));
        return () => window.cancelAnimationFrame(frameId);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return undefined;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
                return;
            }

            if (images.length <= 1) return;

            if (event.key === 'ArrowLeft') {
                onIndexChange((safeIndex - 1 + images.length) % images.length);
            }

            if (event.key === 'ArrowRight') {
                onIndexChange((safeIndex + 1) % images.length);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [images.length, isOpen, onClose, onIndexChange, safeIndex]);

    if (!isOpen || !currentImage || typeof document === 'undefined') {
        return null;
    }

    const handlePrevious = () => {
        if (images.length <= 1) return;
        onIndexChange((safeIndex - 1 + images.length) % images.length);
    };

    const handleNext = () => {
        if (images.length <= 1) return;
        onIndexChange((safeIndex + 1) % images.length);
    };

    return createPortal(
        <>
            <div
                aria-hidden="true"
                className={`fixed inset-0 z-[140] bg-slate-900/45 transition-opacity duration-150 ease-out ${
                    isVisible ? 'opacity-100' : 'opacity-0'
                }`}
                onClick={onClose}
            />
            <div className="fixed inset-0 z-[141] overflow-hidden p-3 md:p-4">
                <div className="flex h-full items-center justify-center">
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label={`${productName} image viewer`}
                        className={`inline-flex max-h-[calc(100vh-1.5rem)] w-fit max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-2xl border border-gray-200/8 bg-[#0B0B0C] shadow-[0_20px_60px_rgba(0,0,0,0.38)] transition-all duration-200 ease-out will-change-transform md:max-h-[calc(100vh-2rem)] md:max-w-[calc(100vw-2rem)] ${
                            isVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-95 opacity-0'
                        }`}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-start justify-between gap-4 border-b border-gray-200/10 px-5 py-4 md:px-6">
                            <div className="min-w-0">
                                <p className="truncate text-base font-black uppercase tracking-[0.22em] text-white md:text-lg">
                                    {productName}
                                </p>
                                <div className="mt-2">
                                    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                                        {viewLabels?.[safeIndex] ?? `Ảnh ${safeIndex + 1}`}
                                    </span>
                                </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                <span
                                    data-testid="lightbox-image-counter"
                                    className="inline-flex h-10 items-center rounded-full border border-white/10 bg-white/[0.04] px-3 text-sm font-semibold text-gray-200"
                                >
                                    {safeIndex + 1}/{images.length}
                                </span>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    aria-label="Close image viewer"
                                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.02] text-white transition-colors hover:border-white/20 hover:bg-white/5"
                                >
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                        </div>

                        <div className="self-center px-2 py-2 md:px-3 md:py-3">
                            <div className="relative">
                            {images.length > 1 && (
                                <button
                                    type="button"
                                    onClick={handlePrevious}
                                    aria-label="Previous lightbox image"
                                    className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/35 text-white transition-colors hover:border-white/20 hover:bg-black/55 md:left-3"
                                >
                                    <span className="material-symbols-outlined text-2xl">arrow_back</span>
                                </button>
                            )}

                            <div className="flex w-fit max-w-[calc(100vw-3rem)] items-center justify-center rounded-[20px] bg-[#F3F1EB] p-2 md:max-w-[calc(100vw-4.5rem)] md:p-3">
                                <img
                                    src={currentImageSrc}
                                    alt={`${productName} - Zoomed`}
                                    className="block h-auto max-h-[82vh] w-auto max-w-[min(86vw,980px)] object-contain md:max-w-[min(84vw,980px)]"
                                />
                            </div>

                            {images.length > 1 && (
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    aria-label="Next lightbox image"
                                    className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/35 text-white transition-colors hover:border-white/20 hover:bg-black/55 md:right-3"
                                >
                                    <span className="material-symbols-outlined text-2xl">arrow_forward</span>
                                </button>
                            )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>,
        document.body,
    );
};
