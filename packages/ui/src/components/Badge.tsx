import React from 'react';

export interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'encrypted';
  children: React.ReactNode;
}

const variantStyles: Record<string, React.CSSProperties> = {
  default: { background: 'var(--dl-bg-surface)', color: 'var(--dl-text-secondary)' },
  success: { background: 'var(--dl-success-bg)', color: 'var(--dl-success)' },
  warning: { background: 'var(--dl-warning-bg)', color: 'var(--dl-warning)' },
  danger: { background: 'var(--dl-danger-bg)', color: 'var(--dl-danger)' },
  info: { background: 'var(--dl-info-bg)', color: 'var(--dl-info)' },
  encrypted: { background: 'var(--dl-encrypted-bg)', color: 'var(--dl-encrypted)' },
};

export const Badge: React.FC<BadgeProps> = ({ variant = 'default', children }) => {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '2px 8px',
      borderRadius: 'var(--dl-radius-full)',
      fontSize: 'var(--dl-font-size-xs)',
      fontWeight: 500,
      ...variantStyles[variant],
    }}>
      {children}
    </span>
  );
};
