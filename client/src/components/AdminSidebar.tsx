import React from 'react';
import { Logo } from './Logo';
import { ViewState } from '../types';

interface AdminSidebarProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ currentView, setView }) => {
  const menuItems = [
    { icon: 'dashboard', label: 'Dashboard', view: 'ADMIN_DASHBOARD' as ViewState },
    { icon: 'checkroom', label: 'Products', view: 'ADMIN_PRODUCTS' as ViewState },
    { icon: 'shopping_bag', label: 'Orders', view: 'ADMIN_ORDERS' as ViewState },
    { icon: 'group', label: 'Customers', view: 'ADMIN_DASHBOARD' as ViewState }, // Placeholder
    { icon: 'bar_chart', label: 'Analytics', view: 'ADMIN_DASHBOARD' as ViewState }, // Placeholder
  ];

  return (
    <aside className="w-64 bg-black border-r border-white/10 flex flex-col h-screen sticky top-0">
      <div className="h-24 flex items-center px-6 border-b border-white/5 cursor-pointer" onClick={() => setView('STORE_HOME')}>
        <Logo className="text-xl" />
      </div>

      <nav className="flex-1 py-8 px-4 space-y-2">
        <div className="px-4 mb-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold">Main Menu</p>
        </div>
        
        {menuItems.map((item) => {
          const isActive = currentView === item.view || (item.view === 'ADMIN_PRODUCTS' && currentView === 'ADMIN_CREATE_PRODUCT');
          return (
            <button
              key={item.label}
              onClick={() => setView(item.view)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded transition-all group border border-transparent ${
                isActive 
                  ? 'bg-white/5 border-primary shadow-[0_4px_20px_-10px_rgba(226,36,29,0.3)]' 
                  : 'text-white/50 hover:text-white hover:bg-white/5 hover:border-white/10'
              }`}
            >
              <span className={`material-symbols-outlined ${isActive ? 'text-primary' : 'group-hover:text-primary transition-colors'}`}>
                {item.icon}
              </span>
              <span className="text-sm font-medium tracking-wide">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-6 border-t border-white/5 bg-surface-dark/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-primary font-bold border border-white/10">
            SA
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Super Admin</p>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">Aisthea HQ</p>
          </div>
          <button onClick={() => setView('STORE_HOME')} className="ml-auto text-white/40 hover:text-white">
            <span className="material-symbols-outlined text-lg">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
};