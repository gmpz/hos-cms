"use client";

import { useState } from "react";

export function WelcomeArtwork({ src, alt }: { src: string; alt: string }) {
  const [portrait, setPortrait] = useState(false);
  return <>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img className={`welcome-image${portrait ? " portrait" : ""}`} src={src} alt={alt}
      onLoad={(event) => setPortrait(event.currentTarget.naturalHeight > event.currentTarget.naturalWidth)}/>
  </>;
}
