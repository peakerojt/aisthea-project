import React from 'react';

interface StoreLayoutProps {
    children: React.ReactNode;
}

export const StoreLayout: React.FC<StoreLayoutProps> = ({ children }) => {
    return (
        <div className="text-white font-sans antialiased min-h-screen bg-bg-dark flex flex-col overflow-x-hidden">
            {children}
        </div>
    );
};
