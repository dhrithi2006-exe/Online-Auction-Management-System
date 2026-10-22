import React, { useState } from 'react';

export default function ImageWithFallback({ src, alt, className = '' }) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={`auction-img-fallback ${className}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          backgroundColor: '#f3efe6',
          color: '#7a766f',
          padding: '12px',
          textAlign: 'center',
          fontSize: '0.82rem',
          userSelect: 'none',
        }}
      >
        <span style={{ fontWeight: 600, fontSize: '0.95rem', color: '#852236', marginBottom: '4px' }}>
          {alt || 'Auction Item'}
        </span>
        <span style={{ fontSize: '0.75rem', color: '#8a867e' }}>[Item Photo]</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || 'Auction item'}
      className={className}
      onError={() => setHasError(true)}
      loading="lazy"
    />
  );
}
