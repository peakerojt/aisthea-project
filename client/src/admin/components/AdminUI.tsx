import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Inbox, LucideIcon, RefreshCw, X } from 'lucide-react';

export type AdminStatCardItem = {
  key: string;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  tone?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  variant?: 'compact' | 'highlight';
};

export type AdminTabItem = {
  key: string;
  label: React.ReactNode;
  count?: number | React.ReactNode;
};

export interface AdminStatusFilterBarProps {
  items: AdminTabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  isRefreshing?: boolean;
  className?: string;
  tabsClassName?: string;
  refreshLabel?: React.ReactNode;
}

export interface AdminRefreshStateProps {
  isRefreshing?: boolean;
  className?: string;
  label?: React.ReactNode;
  align?: 'start' | 'end';
  stabilizeDurationMs?: number;
}

export type AdminTableColumn<T> = {
  key: string;
  header: React.ReactNode;
  className?: string;
  sticky?: 'left' | 'right';
  render: (row: T) => React.ReactNode;
};

export type AdminActionTone = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'cyan' | 'orange';

export interface AdminEmptyStateProps {
  icon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  compact?: boolean;
}

export interface AdminPageHeaderProps {
  icon?: LucideIcon;
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}

export interface AdminToolbarProps {
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export interface AdminModalShellProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: LucideIcon;
  iconWrapperClassName?: string;
  iconClassName?: string;
  onClose?: () => void;
  footer?: React.ReactNode;
  headerActions?: React.ReactNode;
  align?: 'center' | 'start';
  maxWidthClassName?: string;
  panelClassName?: string;
  bodyClassName?: string;
  stickyHeader?: boolean;
  closeOnOverlayClick?: boolean;
  backdropClassName?: string;
  lockBodyScroll?: boolean;
}

const useStableRefreshSignal = (isRefreshing: boolean, minDurationMs = 450) => {
  const [isVisible, setIsVisible] = useState(isRefreshing);
  const hideTimerRef = useRef<number | null>(null);
  const refreshStartedAtRef = useRef<number | null>(isRefreshing ? Date.now() : null);
  const previousRefreshingRef = useRef(isRefreshing);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsVisible(isRefreshing);
      previousRefreshingRef.current = isRefreshing;
      refreshStartedAtRef.current = isRefreshing ? Date.now() : null;
      return undefined;
    }

    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    if (isRefreshing) {
      if (!previousRefreshingRef.current) {
        refreshStartedAtRef.current = Date.now();
      } else if (refreshStartedAtRef.current === null) {
        refreshStartedAtRef.current = Date.now();
      }

      previousRefreshingRef.current = true;
      setIsVisible(true);
      return undefined;
    }

    previousRefreshingRef.current = false;

    if (!isVisible) {
      refreshStartedAtRef.current = null;
      return undefined;
    }

    const elapsed = refreshStartedAtRef.current === null ? minDurationMs : Date.now() - refreshStartedAtRef.current;
    const remaining = Math.max(0, minDurationMs - elapsed);

    if (remaining === 0) {
      refreshStartedAtRef.current = null;
      setIsVisible(false);
      return undefined;
    }

    hideTimerRef.current = window.setTimeout(() => {
      hideTimerRef.current = null;
      refreshStartedAtRef.current = null;
      setIsVisible(false);
    }, remaining);

    return () => {
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, [isRefreshing, isVisible, minDurationMs]);

  useEffect(() => () => {
    if (hideTimerRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  return isVisible;
};

const SURFACE_BASE = 'border border-white/[0.06] bg-[#101217] shadow-[0_18px_50px_rgba(0,0,0,0.24)]';

const TONE_STYLES: Record<
  NonNullable<AdminStatCardItem['tone']>,
  { icon: string; ring: string; text: string; badge: string; dot: string }
> = {
  default: {
    icon: 'border-white/10 bg-white/[0.05] text-white/70',
    ring: 'from-white/0 via-white/10 to-white/0',
    text: 'text-white',
    badge: 'border-white/10 bg-white/[0.05] text-white/70',
    dot: 'bg-white/70',
  },
  primary: {
    icon: 'border-primary/20 bg-primary/10 text-primary',
    ring: 'from-transparent via-primary/25 to-transparent',
    text: 'text-primary',
    badge: 'border-primary/25 bg-primary/10 text-primary',
    dot: 'bg-primary',
  },
  success: {
    icon: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300',
    ring: 'from-transparent via-emerald-400/20 to-transparent',
    text: 'text-emerald-300',
    badge: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
    dot: 'bg-emerald-300',
  },
  warning: {
    icon: 'border-amber-400/20 bg-amber-500/10 text-amber-300',
    ring: 'from-transparent via-amber-400/20 to-transparent',
    text: 'text-amber-300',
    badge: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
    dot: 'bg-amber-300',
  },
  danger: {
    icon: 'border-red-400/20 bg-red-500/10 text-red-300',
    ring: 'from-transparent via-red-400/20 to-transparent',
    text: 'text-red-300',
    badge: 'border-red-500/25 bg-red-500/10 text-red-300',
    dot: 'bg-red-300',
  },
  info: {
    icon: 'border-sky-400/20 bg-sky-500/10 text-sky-300',
    ring: 'from-transparent via-sky-400/20 to-transparent',
    text: 'text-sky-300',
    badge: 'border-sky-500/25 bg-sky-500/10 text-sky-300',
    dot: 'bg-sky-300',
  },
};

const STAT_GRID_CLASS_MAP: Record<number, string> = {
  1: 'xl:grid-cols-1',
  2: 'xl:grid-cols-2',
  3: 'xl:grid-cols-3',
  4: 'xl:grid-cols-4',
};

export const adminUiTokens = {
  shell: 'mx-auto flex h-auto min-h-full w-full max-w-[1680px] flex-col gap-5 px-5 py-6 lg:px-7',
  surface: SURFACE_BASE,
  interactiveSurface: 'border border-white/10 bg-white/[0.04]',
  brandIconSurface: 'border border-[#7a2a2f] bg-[#221012] text-[#ff4b42] shadow-[0_10px_24px_rgba(122,42,47,0.18)]',
  mutedText: 'text-white/45',
  labelText: 'text-[11px] font-bold uppercase tracking-[0.16em] text-white/40',
  fieldLabel: 'mb-1.5 block text-[11px] font-bold uppercase tracking-[0.16em] text-white/40',
  fieldControl: 'w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white/78 transition-colors duration-150 focus:border-primary/40 focus:outline-none [color-scheme:dark] [&>option]:bg-[#14161b] [&>option]:text-white',
  searchFieldControl: 'w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-9 pr-4 text-sm text-white placeholder:text-white/28 transition-colors duration-150 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20',
  tableHeaderSurface: 'bg-white/[0.02] border-b border-white/[0.06]',
  tableHeader: 'text-[10px] font-bold uppercase tracking-[0.18em] text-white/34',
  tableBody: 'divide-y divide-white/[0.04]',
  tableRow: 'border-b border-white/[0.04] transition-colors hover:bg-white/[0.03]',
  tableRowSoft: 'transition-colors hover:bg-white/[0.02]',
  buttonPrimary: 'bg-primary text-white hover:bg-red-500 shadow-[0_10px_24px_rgba(227,24,55,0.22)]',
  buttonSecondary: 'border border-white/10 bg-white/[0.04] text-white/70 hover:border-white/20 hover:bg-white/[0.07] hover:text-white',
};

export const AdminPageShell: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div className={`${adminUiTokens.shell} ${className}`} style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
    {children}
  </div>
);

export const AdminPageHeader: React.FC<AdminPageHeaderProps> = ({
  icon: Icon,
  eyebrow,
  title,
  subtitle,
  meta,
  actions,
}) => (
  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
    <div className="min-w-0">
      <div className="flex items-start gap-4">
        {Icon && (
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${adminUiTokens.brandIconSurface}`}>
            <Icon size={21} className="text-primary" />
          </div>
        )}
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-primary/90">
              {eyebrow}
            </p>
          )}
          <h1 className="text-3xl font-black tracking-tight text-white lg:text-4xl">{title}</h1>
          {(subtitle || meta) && (
            <div className="mt-2 flex flex-col gap-1 text-sm text-white/50 lg:flex-row lg:items-center lg:gap-2">
              {subtitle && <span>{subtitle}</span>}
              {subtitle && meta && <span className="hidden text-white/20 lg:inline">&middot;</span>}
              {meta && <span>{meta}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
    {actions && <div className="flex flex-wrap items-center justify-start gap-3 lg:justify-end">{actions}</div>}
  </div>
);

export const AdminToolbar: React.FC<AdminToolbarProps> = ({ children, actions, className = '' }) => (
  <div className={`flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between ${className}`}>
    <div className="flex flex-1 flex-wrap items-end gap-3">{children}</div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

export const AdminSectionCard: React.FC<{
  children: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  headerClassName?: string;
  bodyClassName?: string;
  className?: string;
}> = ({
  children,
  title,
  subtitle,
  actions,
  headerClassName = '',
  bodyClassName = '',
  className = '',
}) => (
  <section className={`overflow-hidden rounded-3xl ${SURFACE_BASE} ${className}`}>
    {(title || subtitle || actions) && (
      <header className={`border-b border-white/[0.06] px-5 py-4 lg:px-6 ${headerClassName}`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            {title && <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-white/80">{title}</h2>}
            {subtitle && <p className="mt-1 text-sm text-white/45">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      </header>
    )}
    <div className={bodyClassName}>{children}</div>
  </section>
);

export const AdminTabs: React.FC<{
  items: AdminTabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  className?: string;
}> = ({ items, activeKey, onChange, className = '' }) => (
  <div className={`flex gap-2 overflow-x-auto pb-1 ${className}`}>
    {items.map((item) => {
      const isActive = item.key === activeKey;

      return (
        <button
          key={item.key}
          type="button"
          aria-pressed={isActive}
          data-admin-tab-active={isActive ? 'true' : 'false'}
          onClick={() => {
            if (!isActive) {
              onChange(item.key);
            }
          }}
          className={`ui-stable-click shrink-0 inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2.5 text-sm font-semibold transition-[background-color,border-color,color,box-shadow,opacity] duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 ${
            isActive
              ? 'border-primary/30 bg-primary/12 text-white'
              : 'border-white/10 bg-white/[0.03] text-white/60 hover:border-white/20 hover:text-white'
          }`}
        >
          <span>{item.label}</span>
          {item.count !== undefined && (
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                isActive ? 'bg-white/12 text-white' : 'bg-white/[0.06] text-white/55'
              } inline-flex min-w-[1.5rem] justify-center text-center tabular-nums`}
            >
              {item.count}
            </span>
          )}
        </button>
      );
    })}
  </div>
);

export const AdminStatusFilterBar: React.FC<AdminStatusFilterBarProps> = ({
  items,
  activeKey,
  onChange,
  isRefreshing = false,
  className = '',
  tabsClassName = '',
  refreshLabel = 'Dang cap nhat',
}) => {
  const showRefreshingState = useStableRefreshSignal(isRefreshing);

  return (
    <div data-testid="admin-status-filter-bar" className={className}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <AdminTabs
          items={items}
          activeKey={activeKey}
          onChange={onChange}
          className={`min-w-0 flex-1 ${tabsClassName}`}
        />
        <div className="lg:flex lg:justify-end">
          <div
            aria-hidden={showRefreshingState ? undefined : 'true'}
            className={`overflow-hidden transition-[max-height,opacity] duration-200 ${
              showRefreshingState ? 'max-h-12 opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="flex min-h-[36px] items-center">
              <span
                aria-live="polite"
                data-admin-status-refresh-badge="true"
                data-refreshing={showRefreshingState ? 'true' : 'false'}
                className={`inline-flex min-w-[9.5rem] items-center justify-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] transition-[border-color,background-color,color] duration-200 ${
                  showRefreshingState
                    ? 'border-primary/25 bg-primary/10 text-primary'
                    : 'border-white/[0.08] bg-white/[0.03] text-white/28'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${showRefreshingState ? 'bg-primary animate-pulse' : 'bg-white/25'}`} />
                <span>{refreshLabel}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AdminRefreshState: React.FC<AdminRefreshStateProps> = ({
  isRefreshing = false,
  className = '',
  label = 'Dang cap nhat',
  align = 'end',
  stabilizeDurationMs = 450,
}) => {
  const showRefreshingState = useStableRefreshSignal(isRefreshing, stabilizeDurationMs);

  return (
    <div
      data-testid="admin-refresh-state"
      className={`relative h-2 ${className}`}
    >
      <div
        aria-hidden={showRefreshingState ? undefined : 'true'}
        className={`pointer-events-none absolute inset-x-0 top-0 z-10 transition-opacity duration-200 ${
          showRefreshingState ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className={`flex min-h-[36px] items-center ${align === 'start' ? 'justify-start' : 'justify-end'}`}>
          <span
            aria-live="polite"
            data-admin-refresh-badge="true"
            data-refreshing={showRefreshingState ? 'true' : 'false'}
            className={`inline-flex min-w-[9.5rem] items-center justify-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] transition-[border-color,background-color,color] duration-200 ${
              showRefreshingState
                ? 'border-primary/25 bg-primary/10 text-primary'
                : 'border-white/[0.08] bg-white/[0.03] text-white/28'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${showRefreshingState ? 'bg-primary animate-pulse' : 'bg-white/25'}`} />
            <span>{label}</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export const AdminStatCards: React.FC<{
  items: AdminStatCardItem[];
  className?: string;
}> = ({ items, className = '' }) => {
  const xlColsClass = STAT_GRID_CLASS_MAP[Math.min(4, Math.max(1, items.length))] ?? 'xl:grid-cols-4';

  return (
    <div className={`grid gap-4 md:grid-cols-2 ${xlColsClass} ${className}`}>
      {items.map((item) => {
        const Icon = item.icon;
        const tone = TONE_STYLES[item.tone ?? 'default'];
        const variant = item.variant ?? 'compact';

        return (
          <div
            key={item.key}
            className={`relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#14161b] px-5 py-3.5 ${
              variant === 'highlight' ? 'min-h-[128px]' : 'min-h-[96px]'
            }`}
          >
            <div className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r ${tone.ring}`} />
            <div className="relative z-10 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/42">{item.label}</p>
                <div className={`mt-2 font-black tracking-tight text-white ${variant === 'highlight' ? 'text-4xl' : 'text-2xl'}`}>
                  {item.value}
                </div>
                {item.hint && (
                  <div className={`mt-2 text-sm ${tone.text === 'text-white' ? 'text-white/48' : tone.text}`}>
                    {item.hint}
                  </div>
                )}
              </div>
              {Icon && (
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${tone.icon}`}>
                  <Icon size={18} />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const AdminBadge: React.FC<{
  children: React.ReactNode;
  tone?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  dot?: boolean;
  className?: string;
}> = ({ children, tone = 'default', dot = false, className = '' }) => {
  const cfg = TONE_STYLES[tone];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${cfg.badge} ${className}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />}
      {children}
    </span>
  );
};

export const AdminPrimaryButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <button
    {...props}
    className={`ui-stable-click inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-[background-color,border-color,color,box-shadow,opacity] duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/35 disabled:cursor-not-allowed disabled:opacity-40 ${adminUiTokens.buttonPrimary} ${className}`}
  >
    {children}
  </button>
);

export const AdminSecondaryButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <button
    {...props}
    className={`ui-stable-click inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-[background-color,border-color,color,box-shadow,opacity] duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 disabled:cursor-not-allowed disabled:opacity-40 ${adminUiTokens.buttonSecondary} ${className}`}
  >
    {children}
  </button>
);

export const AdminRefreshButton: React.FC<
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
    label: React.ReactNode;
    isRefreshing?: boolean;
  }
> = ({
  className = '',
  label,
  isRefreshing = false,
  disabled,
  ...props
}) => {
  const showRefreshingState = useStableRefreshSignal(isRefreshing);

  return (
    <AdminSecondaryButton
      {...props}
      disabled={disabled || isRefreshing}
      aria-busy={showRefreshingState ? 'true' : 'false'}
      className={`min-w-[7.75rem] justify-center ${className}`}
    >
      <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center">
        <RefreshCw size={14} className={showRefreshingState ? 'animate-spin' : ''} />
      </span>
      <span>{label}</span>
    </AdminSecondaryButton>
  );
};

export const AdminIconButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <button
    {...props}
    className={`ui-stable-click inline-flex h-10 w-10 items-center justify-center rounded-xl transition-[background-color,border-color,color,box-shadow,opacity] duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 disabled:cursor-not-allowed disabled:opacity-40 ${adminUiTokens.buttonSecondary} ${className}`}
  >
    {children}
  </button>
);

export const AdminRowIconButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    tone?: 'default' | 'primary' | 'danger';
  }
> = ({
  className = '',
  children,
  tone = 'default',
  ...props
}) => {
  const toneMap = {
    default: 'text-white/35 hover:border-white/12 hover:bg-white/8 hover:text-white',
    primary: 'text-white/35 hover:border-primary/20 hover:bg-primary/10 hover:text-primary',
    danger: 'text-white/35 hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-400',
  };

  return (
    <button
      {...props}
      className={`ui-stable-click inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent bg-transparent transition-[background-color,border-color,color,box-shadow,opacity] duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 disabled:cursor-not-allowed disabled:opacity-40 ${toneMap[tone]} ${className}`}
    >
      {children}
    </button>
  );
};

export const AdminActionButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    tone?: AdminActionTone;
    size?: 'sm' | 'md';
    variant?: 'soft' | 'solid';
  }
> = ({
  className = '',
  children,
  tone = 'default',
  size = 'sm',
  variant = 'soft',
  ...props
}) => {
  const toneMap: Record<'soft' | 'solid', Record<AdminActionTone, string>> = {
    soft: {
      default: 'border-white/15 bg-white/[0.04] text-white/75 hover:border-white/25 hover:bg-white/[0.08] hover:text-white',
      primary: 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/18',
      success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20',
      warning: 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20',
      danger: 'border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20',
      info: 'border-sky-500/30 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20',
      cyan: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20',
      orange: 'border-orange-500/30 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20',
    },
    solid: {
      default: 'border-white/10 bg-white/10 text-white hover:bg-white/16',
      primary: 'border-primary/60 bg-primary text-white hover:bg-red-500',
      success: 'border-emerald-600/60 bg-emerald-600 text-white hover:bg-emerald-500',
      warning: 'border-amber-600/60 bg-amber-600 text-white hover:bg-amber-500',
      danger: 'border-red-600/60 bg-red-600 text-white hover:bg-red-500',
      info: 'border-sky-600/60 bg-sky-600 text-white hover:bg-sky-500',
      cyan: 'border-cyan-600/60 bg-cyan-600 text-white hover:bg-cyan-500',
      orange: 'border-orange-600/60 bg-orange-600 text-white hover:bg-orange-500',
    },
  };

  const sizeMap = {
    sm: 'rounded-lg px-3 py-1.5 text-xs font-semibold',
    md: 'rounded-xl px-4 py-2 text-sm font-semibold',
  };

  return (
    <button
      {...props}
      className={`ui-stable-click inline-flex items-center justify-center gap-1.5 border transition-[background-color,border-color,color,box-shadow,opacity] duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 disabled:cursor-not-allowed disabled:opacity-40 ${sizeMap[size]} ${toneMap[variant][tone]} ${className}`}
    >
      {children}
    </button>
  );
};

export const AdminModalShell: React.FC<AdminModalShellProps> = ({
  children,
  title,
  subtitle,
  icon: Icon,
  iconWrapperClassName = adminUiTokens.brandIconSurface,
  iconClassName = 'text-primary',
  onClose,
  footer,
  headerActions,
  align = 'center',
  maxWidthClassName = 'max-w-2xl',
  panelClassName = '',
  bodyClassName = '',
  stickyHeader = false,
  closeOnOverlayClick = true,
  backdropClassName = 'bg-slate-900/60',
  lockBodyScroll = true,
}) => {
  const titleId = useId();
  const subtitleId = useId();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const frameId = window.requestAnimationFrame(() => setIsVisible(true));
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    if (!lockBodyScroll || typeof document === 'undefined') return undefined;

    const { body, documentElement } = document;
    const previousBodyOverflow = body.style.overflow;
    const previousDocumentOverflow = documentElement.style.overflow;

    body.style.overflow = 'hidden';
    documentElement.style.overflow = 'hidden';

    return () => {
      body.style.overflow = previousBodyOverflow;
      documentElement.style.overflow = previousDocumentOverflow;
    };
  }, [lockBodyScroll]);

  useEffect(() => {
    if (!onClose || typeof window === 'undefined') return undefined;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-40 transition-opacity duration-150 ease-out ${backdropClassName} ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={closeOnOverlayClick && onClose ? onClose : undefined}
      />
      <div className="fixed inset-0 z-50 overflow-hidden p-3 md:p-4">
        <div className={`flex h-full justify-center ${align === 'center' ? 'items-center' : 'items-start py-6'}`}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-describedby={subtitle ? subtitleId : undefined}
            className={`flex max-h-[calc(100vh-1.5rem)] w-full flex-col overflow-hidden rounded-2xl border border-gray-200/10 dark:border-gray-700 bg-[#0B0B0C] shadow-2xl shadow-black/40 transform-gpu transition-[transform,opacity] duration-150 ease-out will-change-[transform,opacity] md:max-h-[calc(100vh-2rem)] ${
              isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
            } ${maxWidthClassName} ${panelClassName}`}
          >
            {(title || subtitle || Icon || onClose || headerActions) && (
              <div
                className={`shrink-0 flex items-center justify-between gap-4 border-b border-gray-200/10 dark:border-gray-700 px-6 py-5 ${
                  stickyHeader ? 'sticky top-0 z-10 bg-[#0B0B0C]/95' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  {Icon && (
                    <div className={`rounded-lg border p-2 ${iconWrapperClassName}`}>
                      <Icon size={18} className={iconClassName} />
                    </div>
                  )}
                  {(title || subtitle) && (
                    <div>
                      {title && <h2 id={titleId} className="text-sm font-bold text-white">{title}</h2>}
                      {subtitle && <p id={subtitleId} className="text-[11px] text-white/40">{subtitle}</p>}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {headerActions}
                  {onClose && (
                    <AdminIconButton type="button" onClick={onClose} className="h-9 w-9 rounded-lg">
                      <X size={18} />
                    </AdminIconButton>
                  )}
                </div>
              </div>
            )}
            <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${bodyClassName}`}>{children}</div>
            {footer && <div className="shrink-0 border-t border-gray-200/10 dark:border-gray-700 bg-[#0B0B0C]/95 px-6 py-4">{footer}</div>}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

export const AdminEmptyState: React.FC<AdminEmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  action,
  compact = false,
}) => (
  <div className={`flex flex-col items-center justify-center px-6 text-center ${compact ? 'gap-3 py-12' : 'gap-4 py-20'}`}>
    <div className={`flex items-center justify-center rounded-2xl bg-white/[0.03] text-white/20 ${compact ? 'h-14 w-14' : 'h-16 w-16'}`}>
      <Icon size={compact ? 24 : 28} />
    </div>
    <div>
      <p className={`font-semibold text-white/72 ${compact ? 'text-sm' : 'text-base'}`}>{title}</p>
      {description && <p className="mt-1 text-sm text-white/42">{description}</p>}
    </div>
    {action}
  </div>
);

export function AdminDataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  emptyState,
  footer,
  stickyHeader = true,
  minWidth = 920,
  className = '',
}: {
  columns: Array<AdminTableColumn<T>>;
  rows: T[];
  rowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  emptyState?: React.ReactNode;
  footer?: React.ReactNode;
  stickyHeader?: boolean;
  minWidth?: number;
  className?: string;
}) {
  if (rows.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <>
      <div className={`min-h-0 flex-1 overflow-auto ${className}`}>
        <table className="w-full border-collapse text-left" style={{ minWidth }}>
          <thead>
            <tr className="border-b border-white/[0.06]">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`${stickyHeader ? 'sticky top-0 z-10 bg-[#111319]' : 'bg-[#111319]'} px-5 py-3 ${adminUiTokens.tableHeader} ${column.sticky === 'right' ? 'right-0 z-20 text-right' : ''} ${column.sticky === 'left' ? 'left-0 z-20' : ''} ${column.className ?? ''}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                className={`${adminUiTokens.tableRow} ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-5 py-3.5 align-middle ${column.sticky === 'right' ? 'sticky right-0 bg-[#0f1014]' : ''} ${column.sticky === 'left' ? 'sticky left-0 bg-[#0f1014]' : ''} ${column.className ?? ''}`}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footer}
    </>
  );
}
