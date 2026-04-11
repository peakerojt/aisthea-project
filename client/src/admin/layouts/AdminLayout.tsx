import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/admin/components/Sidebar';

export const AdminLayout: React.FC = () => {
  return (
    <div className="flex h-screen w-full bg-bg-dark text-white font-sans overflow-hidden">
      <Sidebar />
      <main className="admin-shell-scrollbars flex-1 h-full overflow-y-auto bg-bg-dark relative">
        <Outlet />
      </main>
    </div>
  );
};
