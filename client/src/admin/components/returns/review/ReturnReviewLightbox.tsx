import React from 'react';
import { X } from 'lucide-react';

interface ReturnReviewLightboxProps {
  closeLabel: string;
  imageAlt: string;
  isVisible: boolean;
  lightboxLabel: string;
  src: string | null;
  onClose: () => void;
}

export const ReturnReviewLightbox: React.FC<ReturnReviewLightboxProps> = ({
  closeLabel,
  imageAlt,
  isVisible,
  lightboxLabel,
  src,
  onClose,
}) => {
  if (!src) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={lightboxLabel}
      className={`fixed inset-0 z-[300] flex cursor-pointer items-center justify-center bg-slate-900/60 p-4 transition-all duration-200 ease-out ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onClose}
    >
      <div
        className={`rounded-2xl border border-gray-200/10 bg-[#0B0B0C] p-4 shadow-2xl shadow-black/40 transform-gpu transition-all duration-200 ease-out will-change-transform ${
          isVisible
            ? 'translate-y-0 scale-100 opacity-100'
            : 'translate-y-2 scale-95 opacity-0'
        }`}
      >
        <img
          src={src}
          alt={imageAlt}
          className="max-h-[84vh] max-w-[88vw] rounded-xl object-contain"
        />
      </div>
      <button
        aria-label={closeLabel}
        className="absolute right-6 top-6 rounded-full border border-white/10 bg-black/70 p-2 text-white/60 transition-colors duration-200 hover:text-white"
        onClick={onClose}
      >
        <X className="h-8 w-8" />
      </button>
    </div>
  );
};
