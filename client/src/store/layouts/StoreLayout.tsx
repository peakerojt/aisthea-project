import React from 'react';
import { Footer } from '@/store/components/Footer';
import { ViewState, CategoryType } from '@/types';

interface StoreLayoutProps {
    children: React.ReactNode;
    setView: (v: ViewState) => void;
    setCategory: (c: CategoryType) => void;
    setCollection: (c: string) => void;
    handleSupportClick: (section: import('@/store/pages/SupportPage').SupportSection) => void;
}

export const StoreLayout: React.FC<StoreLayoutProps> = ({ children, setView, setCategory, setCollection, handleSupportClick }) => {
    return (
        <div className="text-white font-sans antialiased min-h-screen bg-bg-dark flex flex-col overflow-x-hidden">
            <div className="flex-1">
                {children}
            </div>
            <Footer setView={setView} setCategory={setCategory} setCollection={setCollection} handleSupportClick={handleSupportClick} />
        </div>
    );
};
