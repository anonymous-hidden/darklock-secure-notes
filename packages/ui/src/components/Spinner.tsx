import React from 'react';

export interface SpinnerProps {
  size?: number;
  color?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 20, color = 'var(--dl-accent)' }) => (
  <span
    role="status"
    aria-label="Loading"
    style={{
      display: 'inline-block',
      width: size,
      height: size,
      border: `2px solid ${color}`,
      borderTopColor: 'transparent',
      borderRadius: '50%',
      animation: 'dl-spin 0.6s linear infinite',
    }}
  />
);
