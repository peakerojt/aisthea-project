import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Logo } from '@/common/components/Logo';
import { useAuth } from '@/common/contexts/AuthContext';
import { LayoutDashboard, Shirt, ShoppingBag, Users, BarChart2, LogOut, PackagePlus, Tag, TicketPercent, ShieldCheck, RotateCcw } from 'lucide-react';
import { preloadAdminRoute } from '@/app/routes/adminRoutes';

const menuItems = [
  { icon: LayoutDashboard, labelKey: 'sidebar:nav.dashboard', path: '/admin' },
  { icon: Shirt,           labelKey: 'sidebar:nav.products',  path: '/admin/products' },
  { icon: PackagePlus,     labelKey: 'sidebar:nav.restock',   path: '/admin/restock' },
  { icon: Tag,             labelKey: 'sidebar:nav.categories',path: '/admin/categories' },
  { icon: ShoppingBag,     labelKey: 'sidebar:nav.orders',    path: '/admin/orders' },
  { icon: RotateCcw,       labelKey: 'sidebar:nav.returns',   path: '/admin/returns', label: 'Hoàn trả' },
  { icon: Users,           labelKey: 'sidebar:nav.customers', path: '/admin/customers' },
  { icon: BarChart2,       labelKey: 'sidebar:nav.analytics', path: '/admin/analytics' },
  { icon: TicketPercent,   labelKey: 'sidebar:nav.coupons',   path: '/admin/coupons' },
  { icon: ShieldCheck,     labelKey: 'sidebar:nav.roles',     path: '/admin/roles', label: 'Phân quyền' },
];

export const Sidebar: React.FC = () => {
  const { logout, user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handlePreload = React.useCallback((path: string) => {
    preloadAdminRoute(path);
  }, []);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      preloadAdminRoute('/admin/restock');
    }, 250);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <aside className="sticky top-0 flex h-screen w-[236px] flex-col border-r border-white/10 bg-black">
      <div
        className="flex h-24 cursor-pointer items-center border-b border-white/15 px-5"
        onClick={() => navigate('/')}
      >
        <Logo className="text-xl" />
      </div>

      <nav className="flex-1 space-y-2 px-0 py-7">
        <div className="mb-4 px-5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold">
            {t('sidebar:sections.mainMenu')}
          </p>
        </div>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const label = item.label ?? t(item.labelKey);

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/admin'}
              onMouseEnter={() => handlePreload(item.path)}
              onFocus={() => handlePreload(item.path)}
              className={({ isActive }) =>
                `group relative flex w-full items-center gap-3.5 px-5 py-3 transition-colors duration-150 ${
                  isActive
                    ? 'bg-white/5 text-primary border-l-2 border-primary'
                    : 'text-gray-400 hover:text-white hover:bg-white/5 border-l-2 border-transparent'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={20}
                    className={`transition-colors ${isActive ? 'text-primary' : 'text-gray-500 group-hover:text-white'}`}
                  />
                  <span className={`text-sm font-medium tracking-wide truncate ${isActive ? 'font-bold' : ''}`}>
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-white/15 bg-surface-dark/50 p-5">
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

