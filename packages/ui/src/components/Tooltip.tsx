import React from 'react';

export interface TooltipProps {
  text: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const Tooltip: React.FC<TooltipProps> = ({ text, children, position = 'top' }) => {
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }} className="dl-tooltip-wrapper" title={text}>
      {children}
    </span>
  );
};
