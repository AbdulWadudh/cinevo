"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import styles from "./StageLayout.module.css";

const HOLD_MS = 7000;

export default function StageBackdrop({ images }: { images: string[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length < 2) return undefined;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % images.length);
    }, HOLD_MS);
    return () => window.clearInterval(timer);
  }, [images.length]);

  return images.map((src, position) => (
    <Image
      key={src}
      src={src}
      alt=""
      fill
      priority={position === 0}
      sizes="100vw"
      className={`${styles.backdropLayer} ${position === index ? styles.backdropActive : ""}`}
    />
  ));
}
