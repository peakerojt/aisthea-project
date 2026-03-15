import React from 'react';

interface CheckoutSectionCardProps {
    title: string;
    description?: string;
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
}

export const CheckoutSectionCard: React.FC<CheckoutSectionCardProps> = ({
    title,
    description,
    children,
    className = '',
    style,
}) => (
    <section
        className={`mb-8 rounded-sm border border-border-dark bg-surface-dark p-6 animate-fade-in-up lg:p-8 ${className}`.trim()}
        style={style}
    >
        <div className="mb-6 border-b border-border-dark pb-4">
            <h2 className="text-xl font-bold uppercase tracking-wide">{title}</h2>
            {description && (
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-400">{description}</p>
            )}
        </div>

        {children}
    </section>
);
