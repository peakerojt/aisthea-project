
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Logo } from './Logo';
import { ViewState } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, Shirt, ShoppingBag, Users, BarChart2, LogOut, PackagePlus, Tag, TicketPercent, ShieldCheck, RotateCcw, Warehouse } from 'lucide-react';



interface AdminSidebarProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ currentView, setView }) => {
  const { logout, user } = useAuth();
  // Use explicit namespace prefix: t('sidebar:nav.products') → "Sản phẩm"
  // This pattern satisfies TypeScript strict mode while retaining full IDE autocomplete.
  const { t } = useTranslation();

  const menuItems = [
    {
      icon: LayoutDashboard,
      label: t('sidebar:nav.dashboard'),
      view: 'ADMIN_DASHBOARD' as ViewState,
      subRoutes: []
    },
    {
      icon: Shirt,
      label: t('sidebar:nav.products'),
      view: 'ADMIN_PRODUCTS' as ViewState,
      subRoutes: ['ADMIN_CREATE_PRODUCT']
    },
    {
      icon: PackagePlus,
      label: t('sidebar:nav.restock'),
      view: 'ADMIN_RESTOCK' as ViewState,
      subRoutes: []
    },
    {
      icon: Tag,
      label: t('sidebar:nav.categories'),
      view: 'ADMIN_CATEGORIES' as ViewState,
      subRoutes: []
    },
    {
      icon: ShoppingBag,
      label: t('sidebar:nav.orders'),
      view: 'ADMIN_ORDERS' as ViewState,
      subRoutes: ['ADMIN_TRACKING', 'ADMIN_ORDER_DETAIL']
    },
    {
      icon: RotateCcw,
      label: 'Hoàn trả',
      view: 'ADMIN_RETURNS' as ViewState,
      subRoutes: []
    },
    {
      icon: Users,
      label: t('sidebar:nav.customers'),
      view: 'ADMIN_CUSTOMERS' as ViewState,
      subRoutes: []
    },
    {
      icon: BarChart2,
      label: t('sidebar:nav.analytics'),
      view: 'ADMIN_ANALYTICS' as ViewState,
      subRoutes: []
    },
    {
      icon: TicketPercent,
      label: t('sidebar:nav.coupons'),
      view: 'ADMIN_COUPONS' as ViewState,
      subRoutes: []
    },
    {
      icon: ShieldCheck,
      label: 'Phân quyền',
      view: 'ADMIN_ROLES' as ViewState,
      subRoutes: []
    },
    {
      icon: Warehouse,
      label: 'Kho hàng',
      view: 'ADMIN_WAREHOUSES' as ViewState,
      subRoutes: []
    },
  ];


  const handleLogout = () => {
    logout();
    setView('STORE_HOME');
  };

  const isItemActive = (item: typeof menuItems[0]) => {
    // Strict Active Logic
    if (item.view === 'ADMIN_DASHBOARD') {
      return currentView === 'ADMIN_DASHBOARD';
    }
    return currentView === item.view || item.subRoutes.includes(currentView as string);
  };

  return (
    <aside className="w-64 bg-black border-r border-white/10 flex flex-col h-screen sticky top-0">
      <div className="h-24 flex items-center px-6 border-b border-white/15 cursor-pointer" onClick={() => setView('STORE_HOME')}>
        <Logo className="text-xl" />
      </div>

      <nav className="flex-1 py-8 px-0 space-y-2">
        <div className="px-6 mb-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold">
            {t('sidebar:sections.mainMenu')}
          </p>
        </div>

        {menuItems.map((item) => {
          const active = isItemActive(item);
          const Icon = item.icon;

          return (
            <button
              key={item.label}
              onClick={() => setView(item.view)}
              className={`w-full flex items-center gap-4 px-6 py-3 transition-all group relative ${active
                ? 'bg-white/5 text-primary border-l-2 border-primary'
                : 'text-gray-400 hover:text-white hover:bg-white/5 border-l-2 border-transparent'
                }`}
            >
              <Icon
                size={20}
                className={`transition-colors ${active ? 'text-primary' : 'text-gray-500 group-hover:text-white'}`}
              />
              <span className={`text-sm font-medium tracking-wide ${active ? 'font-bold' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="p-6 border-t border-white/15 bg-surface-dark/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-primary font-bold border border-white/10">
            {user?.name?.charAt(0) || 'A'}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-white truncate">{user?.name || 'Admin'}</p>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">{t('sidebar:user.hq')}</p>
          </div>
          <button
            onClick={handleLogout}
            className="ml-auto text-white/40 hover:text-white transition-colors"
            title={t('sidebar:user.signOut')}
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
};
