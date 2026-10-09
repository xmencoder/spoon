"use client";

import React, { useState } from "react";
import Image, { ImageProps } from "next/image";

interface ProductImageProps extends ImageProps {
  quality?: number;
}

export default function ProductImage({ quality = 75, ...props }: ProductImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      {!loaded && (
        <div className="product-img-shimmer" aria-hidden="true" />
      )}
      <Image
        {...props}
        quality={quality}
        onLoad={() => setLoaded(true)}
        style={{
          opacity: loaded ? 1 : 0,
          transition: "opacity 0.25s ease",
          ...((props.style as React.CSSProperties | undefined) ?? {}),
        }}
      />
    </>
  );
}