import React from 'react';
import { Outlet } from 'react-router-dom';

export const StoreLayout: React.FC = () => {
  return (
    <div className="text-white font-sans antialiased min-h-screen bg-bg-dark flex flex-col overflow-x-hidden">
      <Outlet />
    </div>
  );
};
