import React from 'react';
import { Sidebar } from '@/admin/components/Sidebar';
import { ViewState } from '@/types';

interface AdminLayoutProps {
    currentView: ViewState;
    setView: (v: ViewState, id?: number) => void;
    children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ currentView, setView, children }) => {
    return (
        <div className="flex h-screen w-full bg-bg-dark text-white font-sans overflow-hidden">
            <Sidebar currentView={currentView} setView={setView} />
            <main className="flex-1 h-full overflow-y-auto bg-bg-dark relative">
                {children}
            </main>
        </div>
    );
};
