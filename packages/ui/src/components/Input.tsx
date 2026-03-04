import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, style, className = '', ...props }, ref) => {
    const containerStyle: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      width: '100%',
    };

    const inputWrapperStyle: React.CSSProperties = {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
    };

    const inputStyle: React.CSSProperties = {
      width: '100%',
      padding: icon ? '10px 14px 10px 40px' : '10px 14px',
      background: 'var(--dl-bg-input)',
      border: `1px solid ${error ? 'var(--dl-border-danger)' : 'var(--dl-border)'}`,
      borderRadius: 'var(--dl-radius-md)',
      color: 'var(--dl-text-primary)',
      fontSize: 'var(--dl-font-size-base)',
      fontFamily: 'var(--dl-font-sans)',
      outline: 'none',
      transition: 'border-color var(--dl-transition)',
      ...style,
    };

    const iconStyle: React.CSSProperties = {
      position: 'absolute',
      left: '12px',
      color: 'var(--dl-text-tertiary)',
      display: 'flex',
      alignItems: 'center',
      pointerEvents: 'none',
    };

    return (
      <div style={containerStyle} className={className}>
        {label && (
          <label style={{ fontSize: 'var(--dl-font-size-sm)', color: 'var(--dl-text-secondary)', fontWeight: 500 }}>
            {label}
          </label>
        )}
        <div style={inputWrapperStyle}>
          {icon && <span style={iconStyle}>{icon}</span>}
          <input ref={ref} style={inputStyle} {...props} />
        </div>
        {error && (
          <span style={{ fontSize: 'var(--dl-font-size-xs)', color: 'var(--dl-danger)' }}>
            {error}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
