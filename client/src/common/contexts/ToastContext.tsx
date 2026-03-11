import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle, ShoppingBag, AlertTriangle, X, Info } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastType = 'cart' | 'success' | 'error' | 'info';

export interface ToastMessage {
    id: string;
    type: ToastType;
    title: string;
    subtitle?: string;
    duration?: number;
}

interface ToastContextType {
    showToast: (opts: Omit<ToastMessage, 'id'>) => void;
    showCartToast: (productName: string, subtitle?: string) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// ─── Toast Icon per type ──────────────────────────────────────────────────────

const TOAST_CONFIG: Record<ToastType, {
    icon: React.ReactNode;
    accent: string;
    glow: string;
    bg: string;
    border: string;
}> = {
    cart: {
        icon: <ShoppingBag size={18} />,
        accent: 'text-white',
        glow: 'shadow-[0_0_30px_rgba(220,38,38,0.15)]',
        bg: 'bg-[#111111]/95',
        border: 'border-red-500/30',
    },
    success: {
        icon: <CheckCircle size={18} />,
        accent: 'text-emerald-400',
        glow: 'shadow-[0_0_30px_rgba(52,211,153,0.1)]',
        bg: 'bg-[#111111]/95',
        border: 'border-emerald-500/30',
    },
    error: {
        icon: <AlertTriangle size={18} />,
        accent: 'text-red-400',
        glow: 'shadow-[0_0_30px_rgba(239,68,68,0.12)]',
        bg: 'bg-[#111111]/95',
        border: 'border-red-500/30',
    },
    info: {
        icon: <Info size={18} />,
        accent: 'text-blue-400',
        glow: 'shadow-[0_0_30px_rgba(96,165,250,0.1)]',
        bg: 'bg-[#111111]/95',
        border: 'border-blue-500/20',
    },
};

// ─── Single Toast Item ────────────────────────────────────────────────────────

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({
    toast,
    onDismiss,
}) => {
    const cfg = TOAST_CONFIG[toast.type];
    const [visible, setVisible] = React.useState(false);

    React.useEffect(() => {
        // Animate in
        const t1 = setTimeout(() => setVisible(true), 10);
        // Auto-dismiss
        const duration = toast.duration ?? 3500;
        const t2 = setTimeout(() => {
            setVisible(false);
            setTimeout(() => onDismiss(toast.id), 350);
        }, duration);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, []);

    return (
        <div
            role="alert"
            aria-live="polite"
            style={{
                transform: visible ? 'translateX(0) scale(1)' : 'translateX(100%) scale(0.95)',
                opacity: visible ? 1 : 0,
                transition: 'transform 350ms cubic-bezier(0.34,1.56,0.64,1), opacity 300ms ease',
            }}
            className={`
                relative flex items-start gap-3 w-80
                ${cfg.bg} backdrop-blur-2xl
                border ${cfg.border}
                rounded-sm px-4 py-3.5
                ${cfg.glow}
                overflow-hidden
                cursor-default
            `}
        >
            {/* Left accent bar */}
            <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${toast.type === 'cart' ? 'bg-red-500' :
                    toast.type === 'success' ? 'bg-emerald-400' :
                        toast.type === 'error' ? 'bg-red-400' : 'bg-blue-400'
                }`} />

            {/* Icon */}
            <div className={`flex-shrink-0 mt-0.5 ${cfg.accent}`}>
                {cfg.icon}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm leading-snug tracking-wide">
                    {toast.title}
                </p>
                {toast.subtitle && (
                    <p className="text-gray-400 text-xs mt-0.5 leading-relaxed truncate">
                        {toast.subtitle}
                    </p>
                )}
            </div>

            {/* Dismiss button */}
            <button
                onClick={() => {
                    setVisible(false);
                    setTimeout(() => onDismiss(toast.id), 350);
                }}
                className="flex-shrink-0 text-gray-600 hover:text-white transition-colors mt-0.5 cursor-pointer"
                aria-label="Đóng thông báo"
            >
                <X size={14} />
            </button>

            {/* Progress bar */}
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/5">
                <div
                    className={`h-full ${toast.type === 'cart' ? 'bg-red-500' :
                            toast.type === 'success' ? 'bg-emerald-400' :
                                toast.type === 'error' ? 'bg-red-400' : 'bg-blue-400'
                        }`}
                    style={{
                        width: '100%',
                        transformOrigin: 'left',
                        animation: `toast-progress ${(toast.duration ?? 3500)}ms linear forwards`,
                    }}
                />
            </div>
        </div>
    );
};

// ─── Toast Container ──────────────────────────────────────────────────────────

const ToastContainer: React.FC<{
    toasts: ToastMessage[];
    onDismiss: (id: string) => void;
}> = ({ toasts, onDismiss }) => (
    <div
        aria-label="Thông báo"
        className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none"
        style={{ maxWidth: '320px' }}
    >
        {toasts.map(t => (
            <div key={t.id} className="pointer-events-auto">
                <ToastItem toast={t} onDismiss={onDismiss} />
            </div>
        ))}
    </div>
);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const dismiss = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const showToast = useCallback((opts: Omit<ToastMessage, 'id'>) => {
        const id = `toast-${Date.now()}-${Math.random()}`;
        setToasts(prev => [...prev.slice(-4), { ...opts, id }]); // giới hạn 5 toast
    }, []);

    const showCartToast = useCallback((productName: string, subtitle?: string) => {
        showToast({
            type: 'cart',
            title: 'Đã lưu vào giỏ hàng',
            subtitle: subtitle ?? `${productName} · Đăng nhập để hoàn tất mua hàng`,
            duration: 4000,
        });
    }, [showToast]);

    return (
        <ToastContext.Provider value={{ showToast, showCartToast }}>
            {children}
            <ToastContainer toasts={toasts} onDismiss={dismiss} />
            {/* Inject keyframe animation */}
            <style>{`
                @keyframes toast-progress {
                    from { transform: scaleX(1); }
                    to   { transform: scaleX(0); }
                }
            `}</style>
        </ToastContext.Provider>
    );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useToast = (): ToastContextType => {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast phải được dùng bên trong ToastProvider');
    return ctx;
};
