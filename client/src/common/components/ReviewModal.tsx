import React, { useEffect, useState } from 'react';
import { Star, X, Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createReview } from '@/common/services/review.service';
import { OrderItem } from '@/common/services/order.service';

interface ReviewModalProps {
    open: boolean;
    onClose: () => void;
    item: OrderItem | null;
    orderId: string;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({ open, onClose, item, orderId }) => {
    const queryClient = useQueryClient();
    const [rating, setRating] = useState(0);
    const [hovered, setHovered] = useState(0);
    const [comment, setComment] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [isVisible, setIsVisible] = useState(false);

    const mutation = useMutation({
        mutationFn: () =>
            createReview({
                orderItemId: item!.orderItemId,
                productId: Number(item!.productId),
                rating,
                comment: comment.trim() || undefined,
            }),
        onSuccess: () => {
            setSuccessMsg('Đánh giá của bạn đã được ghi nhận.');
            queryClient.invalidateQueries({ queryKey: ['order-detail', orderId] });
            // Notify ProductDetail to re-fetch reviews
            window.dispatchEvent(new CustomEvent('review-submitted', { detail: { productId: Number(item!.productId) } }));
            setTimeout(() => {
                setSuccessMsg('');
                setRating(0);
                setComment('');
                onClose();
            }, 1500);
        },
    });

    useEffect(() => {
        if (!open) {
            setIsVisible(false);
            return undefined;
        }

        const frameId = window.requestAnimationFrame(() => setIsVisible(true));
        return () => window.cancelAnimationFrame(frameId);
    }, [open]);

    if (!open || !item) return null;

    const displayRating = hovered || rating;
    const thumbnail = item.thumbnailUrl ?? item.thumbnail ?? null;
    const variantLabel = item.variantName ?? item.variant ?? '';

    return (
        <div
            role="presentation"
            className={`fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-[3px] transition-all duration-200 ease-out ${
                isVisible ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="review-modal-title"
                className={`relative w-full max-w-md overflow-hidden rounded-2xl border border-white/12 shadow-[0_25px_60px_rgba(0,0,0,0.7)] transform-gpu transition-all duration-200 ease-out will-change-transform ${
                    isVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-95 opacity-0'
                }`}
                style={{
                    background:
                        'linear-gradient(135deg, rgba(15,15,25,0.98) 0%, rgba(20,20,35,0.98) 100%)',
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/[0.06] px-6 pb-4 pt-5">
                    <h2 id="review-modal-title" className="text-sm font-bold uppercase tracking-widest text-white/80">
                        Đánh giá sản phẩm
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-white/40 transition-all hover:bg-white/10 hover:text-white"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="px-6 py-5 space-y-5">
                    {/* Product summary */}
                    <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.04] p-3">
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/5">
                            {thumbnail ? (
                                <img src={thumbnail} alt={item.productName} className="h-full w-full object-cover" />
                            ) : (
                                <div className="h-full w-full flex items-center justify-center text-white/20 text-sm">?</div>
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className="text-white text-sm font-medium truncate">{item.productName}</p>
                            {variantLabel && (
                                <p className="text-white/50 text-xs mt-0.5 truncate">{variantLabel}</p>
                            )}
                        </div>
                    </div>

                    {/* Star rating */}
                    <div>
                        <p className="text-[11px] uppercase tracking-widest text-white/40 mb-2.5">Đánh giá của bạn</p>
                        <div className="flex gap-1.5" onMouseLeave={() => setHovered(0)}>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    onMouseEnter={() => setHovered(star)}
                                    onClick={() => setRating(star)}
                                    className="group transition-transform hover:scale-110 active:scale-95"
                                    aria-label={`${star} sao`}
                                >
                                    <Star
                                        size={30}
                                        className="transition-colors duration-150"
                                        fill={star <= displayRating ? '#FBBF24' : 'transparent'}
                                        stroke={star <= displayRating ? '#FBBF24' : 'rgba(255,255,255,0.25)'}
                                        strokeWidth={1.5}
                                    />
                                </button>
                            ))}
                        </div>
                        {displayRating > 0 && (
                            <p className="text-xs text-amber-400/80 mt-1.5 font-medium">
                                {['', 'Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Xuất sắc'][displayRating]}
                            </p>
                        )}
                    </div>

                    {/* Comment textarea */}
                    <div>
                        <p className="text-[11px] uppercase tracking-widest text-white/40 mb-2.5">Nhận xét</p>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Chia sẻ cảm nhận của bạn về sản phẩm..."
                            rows={4}
                            maxLength={1000}
                            className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/25 transition-all focus:border-white/30 focus:bg-black/40 focus:outline-none"
                        />
                        <p className="text-[10px] text-white/25 text-right mt-1">{comment.length}/1000</p>
                    </div>

                    {/* Error */}
                    {mutation.isError && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-300">
                            Gửi đánh giá thất bại. Vui lòng thử lại.
                        </div>
                    )}

                    {/* Success message */}
                    {successMsg && (
                        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 text-center font-medium">
                            {successMsg}
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        onClick={() => mutation.mutate()}
                        disabled={rating === 0 || mutation.isPending}
                        className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${rating === 0 || mutation.isPending
                            ? 'bg-white/5 border border-white/10 text-white/30 cursor-not-allowed'
                            : 'bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 hover:border-amber-500/60 text-amber-300 hover:text-amber-200 shadow-[0_0_20px_rgba(251,191,36,0.1)] hover:shadow-[0_0_25px_rgba(251,191,36,0.15)]'
                            }`}
                    >
                        {mutation.isPending ? (
                            <span className="flex items-center justify-center gap-2">
                                <Loader2 size={14} className="animate-spin" />
                                Đang gửi...
                            </span>
                        ) : (
                            'Gửi đánh giá'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
