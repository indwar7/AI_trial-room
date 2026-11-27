"use client";

import { useState } from "react";
import { DEFAULT_FABRIC_SCALE, SAMPLE_FABRICS, type Design } from "@/lib/catalogue";
import { fabricFromPicture, type Fabric } from "@/lib/fabric";
import DesignPreview from "./DesignPreview";
import PhotoButtons from "./PhotoButtons";
import { SwatchMark } from "./icons";

interface Props {
  /** The chosen design, shown made in the fabric. */
  design: Design | null;
  fabric: Fabric | null;
  scale: number;
  disabled: boolean;
  onFabric: (fabric: Fabric, scale: number) => void;
  onScale: (scale: number) => void;
}

const SMALLEST = 0.08;
const BIGGEST = 0.8;

/** Step 2: the fabric the garment is made in, from a photo or from the samples. */
export default function FabricPane({ design, fabric, scale, disabled, onFabric, onScale }: Props) {
  /** The store's own fabric, kept so it stays on offer after a sample is tried. */
  const [own, setOwn] = useState<Fabric | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  async function pickSample(id: string) {
    const sample = SAMPLE_FABRICS.find((s) => s.id === id);
    if (!sample || loading || disabled) return;
    setLoading(id);
    setProblem(null);
    try {
      onFabric(await fabricFromPicture(sample.id, sample.name, sample.image, false), sample.scale);
    } catch {
      setProblem("That fabric could not be loaded. Check your internet connection and try again.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <section className="pane pane--fabric" aria-labelledby="fabric-title">
      <header className="pane__head">
        <span className="pane__num" aria-hidden="true">
          2
        </span>
        <h2 id="fabric-title">The fabric</h2>
      </header>

      <div className={design || fabric ? "stage stage--filled" : "stage"}>
        {design ? (
          <DesignPreview
            className="stage__img"
            template={design.template}
            fabric={fabric}
            scale={scale}
            width={768}
            height={1024}
          />
        ) : fabric ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="stage__img stage__img--cover" src={fabric.swatch} alt={fabric.name} />
        ) : (
          <div className="stage__empty">
            <SwatchMark />
            <p>Photograph the fabric flat and close, filling the frame, in even light.</p>
          </div>
        )}
      </div>
      {design && !fabric && (
        <p className="pane__note">Add the fabric to see this design made in it.</p>
      )}

      <PhotoButtons
        kind="fabric"
        subject="the fabric"
        cameraHint="Hold the phone flat over the fabric and fill the frame with it."
        hasPhoto={own !== null}
        disabled={disabled}
        onPhoto={async (photo) => {
          setProblem(null);
          try {
            const made = await fabricFromPicture("own", "Your fabric", photo.dataUrl, true);
            setOwn(made);
            onFabric(made, DEFAULT_FABRIC_SCALE);
          } catch {
            setProblem("That photo could not be used as a fabric. Try another.");
          }
        }}
      />

      {problem && (
        <p className="problem" role="alert">
          {problem}
        </p>
      )}

      <div className="swatches" role="group" aria-label="Fabrics">
        {own && (
          <button
            type="button"
            className="swatch swatch--own"
            aria-pressed={fabric?.id === "own"}
            aria-label="Your fabric"
            title="Your fabric"
            disabled={disabled}
            onClick={() => onFabric(own, DEFAULT_FABRIC_SCALE)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={own.swatch} alt="" />
          </button>
        )}
        {SAMPLE_FABRICS.map((sample) => (
          <button
            key={sample.id}
            type="button"
            className="swatch"
            aria-pressed={fabric?.id === sample.id}
            aria-label={sample.name}
            title={sample.name}
            disabled={disabled || loading !== null}
            onClick={() => pickSample(sample.id)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sample.image} alt="" loading="lazy" />
          </button>
        ))}
      </div>

      <label className={fabric ? "size" : "size size--off"}>
        <span>Pattern size</span>
        <input
          type="range"
          min={SMALLEST}
          max={BIGGEST}
          step={0.02}
          value={scale}
          disabled={disabled || !fabric}
          onChange={(e) => onScale(Number(e.target.value))}
        />
      </label>
    </section>
  );
}
