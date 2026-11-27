"use client";

import { useEffect, useRef } from "react";
import { dress, loadPicture, type Fabric } from "@/lib/fabric";

interface Props {
  /** The design's template picture. */
  template: string;
  /** The fabric to make it in. Without one it is shown in plain cloth. */
  fabric: Fabric | null;
  scale: number;
  /** Drawing size in pixels. The canvas is then sized by CSS. */
  width?: number;
  height?: number;
  className?: string;
}

/** A design drawn in a fabric. Redraws when either changes. */
export default function DesignPreview({
  template,
  fabric,
  scale,
  width = 384,
  height = 512,
  className,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let current = true;
    loadPicture(template)
      .then((picture) => {
        const canvas = ref.current;
        const ctx = canvas?.getContext("2d");
        if (!current || !canvas || !ctx) return;
        const made = dress(picture, fabric, scale, canvas.width, canvas.height, false);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(made, 0, 0);
        canvas.dataset.drawn = `${fabric?.id ?? "plain"}@${scale}`;
      })
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [template, fabric, scale]);

  return <canvas ref={ref} className={className} width={width} height={height} aria-hidden="true" />;
}
