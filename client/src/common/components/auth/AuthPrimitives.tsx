import React, { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

const authInputClassName =
  'ui-stable-click h-14 w-full rounded-sm border bg-white/[0.02] px-4 text-[15px] text-white outline-none transition-[border-color,box-shadow,background-color,color] duration-150 placeholder:text-zinc-600 disabled:cursor-not-allowed disabled:opacity-60';

const toneClasses = {
  error: 'text-red-400',
  muted: 'text-zinc-500',
  success: 'text-emerald-400',
  info: 'text-zinc-400',
};

interface AuthPageHeaderProps {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  align?: 'left' | 'center';
  className?: string;
}

export const AuthPageHeader: React.FC<AuthPageHeaderProps> = ({
  eyebrow,
  title,
  subtitle,
  align = 'left',
  className,
}) => (
  <div className={cx('space-y-4', align === 'center' && 'text-center', className)}>
    {eyebrow ? (
      <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-primary/95">{eyebrow}</p>
    ) : null}
    <div className="space-y-3">
      <h1 className="text-4xl font-black uppercase tracking-[-0.04em] text-white sm:text-5xl">{title}</h1>
      {subtitle ? <div className="max-w-xl text-sm leading-7 text-zinc-400 sm:text-[15px]">{subtitle}</div> : null}
    </div>
  </div>
);

interface AuthHelperRowProps {
  id?: string;
  message?: React.ReactNode;
  tone?: 'muted' | 'error' | 'success' | 'info';
  align?: 'left' | 'center';
  className?: string;
  live?: 'polite' | 'assertive' | 'off';
}

export const AuthHelperRow: React.FC<AuthHelperRowProps> = ({
  id,
  message,
  tone = 'muted',
  align = 'left',
  className,
  live = 'off',
}) => (
  <div
    id={id}
    data-auth-helper="true"
    className={cx(
      'min-h-[1.5rem] pt-2 text-[12px] leading-5',
      align === 'center' ? 'text-center' : 'text-left',
      className,
    )}
    aria-live={live === 'off' ? undefined : live}
  >
    <span className={cx(toneClasses[tone], !message && 'opacity-0')} aria-hidden={!message}>
      {message || '\u00A0'}
    </span>
  </div>
);

interface AuthFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: React.ReactNode;
  error?: React.ReactNode;
  helperText?: React.ReactNode;
  containerClassName?: string;
  inputClassName?: string;
  trailing?: React.ReactNode;
}

export const AuthField = React.forwardRef<HTMLInputElement, AuthFieldProps>(function AuthField(
  { label, error, helperText, containerClassName, inputClassName, trailing, id, className, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const hasError = Boolean(error);
  const helperId = `${inputId}-helper`;
  const describedBy = error || helperText ? helperId : undefined;

  return (
    <div className={cx('space-y-0', containerClassName)}>
      <label
        htmlFor={inputId}
        className={cx(
          'mb-3 block text-[11px] font-bold uppercase tracking-[0.24em]',
          hasError ? 'text-red-400' : 'text-zinc-500',
        )}
      >
        {label}
      </label>
      <div className="relative">
        <input
          {...props}
          ref={ref}
          id={inputId}
          aria-describedby={describedBy}
          aria-invalid={hasError || undefined}
          className={cx(
            authInputClassName,
            trailing ? 'pr-12' : 'pr-4',
            hasError
              ? 'border-red-500/60 focus-visible:border-red-400 focus-visible:ring-1 focus-visible:ring-red-500/25'
              : 'border-white/12 hover:border-white/20 focus-visible:border-white/35 focus-visible:ring-1 focus-visible:ring-primary/35',
            'focus-visible:bg-white/[0.03]',
            className,
            inputClassName,
          )}
        />
        {trailing ? <div className="absolute inset-y-0 right-0 flex items-center pr-3">{trailing}</div> : null}
      </div>
      <AuthHelperRow
        id={helperId}
        message={error || helperText}
        tone={hasError ? 'error' : 'muted'}
        live={hasError ? 'polite' : 'off'}
      />
    </div>
  );
});

interface AuthPasswordFieldProps extends Omit<AuthFieldProps, 'type' | 'trailing'> {
  showLabel?: string;
  hideLabel?: string;
}

export const AuthPasswordField = React.forwardRef<HTMLInputElement, AuthPasswordFieldProps>(function AuthPasswordField(
  { showLabel = 'Show password', hideLabel = 'Hide password', ...props },
  ref,
) {
  const [visible, setVisible] = useState(false);

  return (
    <AuthField
      {...props}
      ref={ref}
      type={visible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="ui-stable-click rounded-sm p-1 text-zinc-500 transition-colors duration-150 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
          aria-label={visible ? hideLabel : showLabel}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      }
    />
  );
});

interface AuthStatusRailProps {
  message?: React.ReactNode;
  tone?: 'info' | 'success' | 'error';
  reserveSpace?: boolean;
  compact?: boolean;
  className?: string;
}

export const AuthStatusRail: React.FC<AuthStatusRailProps> = ({
  message,
  tone = 'info',
  reserveSpace = false,
  compact = false,
  className,
}) => {
  if (!reserveSpace && !message) {
    return null;
  }

  const styleByTone = {
    info: 'border-white/12 bg-white/[0.03] text-zinc-300',
    success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
    error: 'border-red-500/20 bg-[#150708] text-red-300',
  };

  return (
    <div className={cx(reserveSpace && (compact ? 'min-h-[2.35rem]' : 'min-h-[4.5rem]'), className)}>
      <div
        data-auth-status-rail="true"
        data-auth-status-variant={compact ? 'compact' : 'default'}
        role={message ? 'alert' : undefined}
        aria-live={message ? 'polite' : undefined}
        className={cx(
          compact
            ? 'rounded-sm border px-3 py-2 text-[12px] leading-5 shadow-[0_8px_20px_rgba(120,0,0,0.12)]'
            : 'rounded-sm border px-4 py-3 text-sm leading-6 shadow-[0_16px_40px_rgba(0,0,0,0.22)]',
          'transition-[opacity,transform] duration-150',
          styleByTone[tone],
          message ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 -translate-y-1',
        )}
      >
        {message || '\u00A0'}
      </div>
    </div>
  );
};

interface AuthPrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: React.ReactNode;
  loadingLabel?: React.ReactNode;
  loading?: boolean;
}

export const AuthPrimaryButton: React.FC<AuthPrimaryButtonProps> = ({
  label,
  loadingLabel,
  loading = false,
  className,
  disabled,
  ...props
}) => (
  <button
    {...props}
    disabled={disabled || loading}
    aria-busy={loading}
    aria-label={typeof (loading ? loadingLabel : label) === 'string' ? (loading ? loadingLabel : label) as string : undefined}
    className={cx(
      'ui-stable-click relative flex min-h-[56px] w-full items-center justify-center overflow-hidden rounded-sm bg-primary px-4 py-4 text-sm font-bold uppercase tracking-[0.18em] text-white shadow-[0_18px_40px_rgba(220,38,38,0.28)] transition-[background-color,border-color,color,box-shadow,opacity] duration-150 hover:bg-red-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/45 disabled:cursor-not-allowed disabled:opacity-70',
      className,
    )}
  >
    <span aria-hidden="true" className={cx('transition-opacity duration-150', loading && 'opacity-0')}>
      {label}
    </span>
    <span
      aria-hidden="true"
      className={cx(
        'pointer-events-none absolute inset-0 flex items-center justify-center gap-2 transition-opacity duration-150',
        loading ? 'opacity-100' : 'opacity-0',
      )}
    >
      <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
      <span>{loadingLabel || label}</span>
    </span>
  </button>
);

interface AuthOAuthButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  label: React.ReactNode;
}

export const AuthOAuthButton: React.FC<AuthOAuthButtonProps> = ({ icon, label, className, ...props }) => (
  <button
    {...props}
    className={cx(
      'ui-stable-click flex min-h-[56px] w-full items-center justify-center gap-3 rounded-sm border border-white/15 bg-white px-4 py-4 text-sm font-bold uppercase tracking-[0.16em] text-zinc-900 transition-[background-color,border-color,color,box-shadow,opacity] duration-150 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30 disabled:cursor-not-allowed disabled:opacity-60',
      className,
    )}
  >
    {icon}
    <span>{label}</span>
  </button>
);

export const AuthDivider: React.FC<{ label: React.ReactNode; className?: string }> = ({ label, className }) => (
  <div className={cx('relative py-2', className)}>
    <div className="absolute inset-0 flex items-center">
      <div className="w-full border-t border-white/10" />
    </div>
    <div className="relative flex justify-center text-[11px] uppercase">
      <span className="bg-black px-4 font-bold tracking-[0.24em] text-zinc-500">{label}</span>
    </div>
  </div>
);

interface AuthFooterLinksProps {
  children: React.ReactNode;
  className?: string;
}

export const AuthFooterLinks: React.FC<AuthFooterLinksProps> = ({ children, className }) => (
  <div className={cx('text-sm text-zinc-500', className)}>{children}</div>
);

interface AuthStatePanelProps {
  badge: React.ReactNode;
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  meta?: React.ReactNode;
  children?: React.ReactNode;
  align?: 'left' | 'center';
}

export const AuthStatePanel: React.FC<AuthStatePanelProps> = ({
  badge,
  eyebrow,
  title,
  description,
  meta,
  children,
  align = 'center',
}) => (
  <div className={cx('flex flex-col gap-6 py-6', align === 'center' && 'items-center text-center')}>
    {eyebrow ? <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-primary/95">{eyebrow}</p> : null}
    <div>{badge}</div>
    <div className="space-y-3">
      <h1 className="text-3xl font-black uppercase tracking-[-0.03em] text-white sm:text-4xl">{title}</h1>
      {description ? <div className="max-w-md text-sm leading-7 text-zinc-400">{description}</div> : null}
      {meta ? <div className="text-sm text-zinc-500">{meta}</div> : null}
    </div>
    {children ? <div className="w-full max-w-sm space-y-3">{children}</div> : null}
  </div>
);
