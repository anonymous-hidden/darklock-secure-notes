import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  tooltip?: string;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  tooltip,
  children,
  disabled,
  className = '',
  ...props
}) => {
  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    border: 'none',
    borderRadius: 'var(--dl-radius-md)',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    fontFamily: 'var(--dl-font-sans)',
    fontWeight: 500,
    transition: 'all var(--dl-transition)',
    opacity: disabled || loading ? 0.5 : 1,
    whiteSpace: 'nowrap',
    userSelect: 'none',
    outline: 'none',
    position: 'relative',
  };

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { padding: '6px 12px', fontSize: 'var(--dl-font-size-sm)' },
    md: { padding: '8px 16px', fontSize: 'var(--dl-font-size-base)' },
    lg: { padding: '12px 24px', fontSize: 'var(--dl-font-size-lg)' },
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: 'var(--dl-accent)',
      color: 'white',
    },
    secondary: {
      background: 'var(--dl-bg-surface)',
      color: 'var(--dl-text-primary)',
      border: '1px solid var(--dl-border)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--dl-text-secondary)',
    },
    danger: {
      background: 'var(--dl-danger)',
      color: 'white',
    },
    success: {
      background: 'var(--dl-success)',
      color: 'white',
    },
  };

  return (
    <button
      style={{ ...baseStyles, ...sizeStyles[size], ...variantStyles[variant] }}
      className={`dl-btn dl-btn-${variant} dl-btn-${size} ${className}`}
      disabled={disabled || loading}
      title={tooltip}
      aria-label={tooltip || (typeof children === 'string' ? children : undefined)}
      {...props}
    >
      {loading ? (
        <span style={{ width: 16, height: 16, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'dl-spin 0.6s linear infinite', display: 'inline-block' }} />
      ) : icon ? (
        <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>
      ) : null}
      {children}
    </button>
  );
};
