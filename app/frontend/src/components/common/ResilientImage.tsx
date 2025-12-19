import React, { useEffect, useMemo, useState } from "react";

type Props = React.ImgHTMLAttributes<HTMLImageElement> & {
  src: string;
};

function isHttpUrl(u: string) {
  return /^https?:\/\//i.test(u || "");
}
function isDataOrBlob(u: string) {
  return /^(data:|blob:)/i.test(u || "");
}

export default function ResilientImage({ src, ...rest }: Props) {
  const original = String(src || "");

  const initial = useMemo(() => {
    if (!original) return "";
    if (isDataOrBlob(original)) return original;
    if (isHttpUrl(original)) return `/api/image-proxy?url=${encodeURIComponent(original)}`;
    return original;
  }, [original]);

  const [currentSrc, setCurrentSrc] = useState<string>(initial);
  const [triedProxy, setTriedProxy] = useState<boolean>(isHttpUrl(original));

  useEffect(() => {
    setCurrentSrc(initial);
    setTriedProxy(isHttpUrl(original));
  }, [initial, original]);

  function onError(e: any) {
    // Als we per ongeluk een data: via proxy kregen (of iets raars), stop ermee
    if (isDataOrBlob(original)) {
      setCurrentSrc(original);
      return;
    }

    // Als we nog niet via proxy geprobeerd hebben en het is http: probeer proxy
    if (isHttpUrl(original) && !triedProxy) {
      setTriedProxy(true);
      setCurrentSrc(`/api/image-proxy?url=${encodeURIComponent(original)}`);
      return;
    }

    // Anders: val terug naar originele src (kan ook extern zijn; dan faalt ie gewoon stil)
    setCurrentSrc(original);
  }

  if (!currentSrc) return null;

  return <img {...rest} src={currentSrc} onError={onError} />;
}

