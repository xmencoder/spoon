"use client";

import React, { useState } from "react";
import Image, { ImageProps } from "next/image";

export default function ProductImage(props: ImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      {!loaded && (
        <div className="product-img-loader-fill" aria-hidden="true">
          <div className="product-img-loader" />
        </div>
      )}
      <Image
        {...props}
        onLoad={() => setLoaded(true)}
        style={{
          opacity: loaded ? 1 : 0,
          transition: "opacity 0.35s ease",
          ...((props.style as React.CSSProperties | undefined) ?? {}),
        }}
      />
    </>
  );
}