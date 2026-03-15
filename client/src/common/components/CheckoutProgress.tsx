import React from 'react';

export interface CheckoutProgressStep {
    key: string;
    label: string;
    hint: string;
}

interface CheckoutProgressProps {
    currentStep: string;
    steps: CheckoutProgressStep[];
    className?: string;
}

export const CheckoutProgress: React.FC<CheckoutProgressProps> = ({
    currentStep,
    steps,
    className = '',
}) => {
    const currentIndex = Math.max(steps.findIndex(step => step.key === currentStep), 0);

    return (
        <ol className={`grid grid-cols-1 gap-3 sm:grid-cols-3 ${className}`}>
            {steps.map((step, index) => {
                const isCompleted = index < currentIndex;
                const isActive = index === currentIndex;

                return (
                    <li
                        key={step.key}
                        className={`rounded-sm border px-4 py-4 transition-colors ${isActive
                            ? 'border-primary bg-primary/10'
                            : isCompleted
                                ? 'border-white/20 bg-white/[0.04]'
                                : 'border-white/10 bg-white/[0.02]'
                            }`}
                    >
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <span
                                className={`inline-flex h-8 w-8 items-center justify-center rounded-full border text-[11px] font-black tracking-[0.2em] ${isActive
                                    ? 'border-primary bg-primary text-white'
                                    : isCompleted
                                        ? 'border-white/30 bg-white text-black'
                                        : 'border-white/15 text-white/40'
                                    }`}
                            >
                                {String(index + 1).padStart(2, '0')}
                            </span>
                            <span
                                className={`text-[10px] font-bold uppercase tracking-[0.24em] ${isActive
                                    ? 'text-primary'
                                    : isCompleted
                                        ? 'text-white/70'
                                        : 'text-white/30'
                                    }`}
                            >
                                {isActive ? 'Hiện tại' : isCompleted ? 'Hoàn tất' : 'Tiếp theo'}
                            </span>
                        </div>
                        <p className={`text-sm font-bold uppercase tracking-wide ${isActive ? 'text-white' : 'text-white/80'}`}>
                            {step.label}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-white/45">
                            {step.hint}
                        </p>
                    </li>
                );
            })}
        </ol>
    );
};
