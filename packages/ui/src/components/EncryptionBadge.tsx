import React from 'react';

export interface EncryptionBadgeProps {
  encrypted?: boolean;
  algorithm?: string;
}

export const EncryptionBadge: React.FC<EncryptionBadgeProps> = ({
  encrypted = true,
  algorithm = 'XChaCha20-Poly1305',
}) => (
  <span
    title={encrypted ? `Encrypted with ${algorithm}` : 'Not encrypted'}
    style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '2px 8px',
      borderRadius: 'var(--dl-radius-full)',
      fontSize: 'var(--dl-font-size-xs)',
      fontWeight: 500,
      background: encrypted ? 'var(--dl-encrypted-bg)' : 'var(--dl-danger-bg)',
      color: encrypted ? 'var(--dl-encrypted)' : 'var(--dl-danger)',
    }}
  >
    {encrypted ? '🔒' : '⚠️'} {encrypted ? 'E2E Encrypted' : 'Unencrypted'}
  </span>
);
