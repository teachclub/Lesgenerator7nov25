import React, { useState, useEffect } from 'react';

type ResilientImageProps = {
  src?: string | null;
  alt?: string;
  className?: string;
};

export const ResilientImage: React.FC<ResilientImageProps> = ({
  src,
  alt = 'Afbeelding',
  className = '',
}) => {
  const [currentSrc, setCurrentSrc] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [retryWithProxy, setRetryWithProxy] = useState(false);

  useEffect(() => {
    if (src) {
        setCurrentSrc(src);
        setHasError(false);
        setRetryWithProxy(false);
    } else {
        setCurrentSrc(null);
    }
  }, [src]);

  const handleError = () => {
    if (!retryWithProxy && src) {
      // Eerste keer fout? Probeer via proxy!
      setRetryWithProxy(true);
      setCurrentSrc(`/api/image-proxy?url=${encodeURIComponent(src)}`);
    } else {
      // Proxy ook mislukt? Dan is het echt stuk.
      setHasError(true);
    }
  };

  if (!currentSrc || hasError) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 text-gray-400 text-xs p-2 ${className}`}>
        <span className="italic">Geen beeld</span>
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={handleError}
    />
  );
};

export default ResilientImage;
