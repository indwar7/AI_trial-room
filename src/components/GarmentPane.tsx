"use client";

import { useState } from "react";
import {
  CATALOGUE_GENDERS,
  CATALOGUE_TYPES,
  designsFor,
  type Design,
} from "@/lib/catalogue";
import type { Fabric } from "@/lib/fabric";
import type { Gender } from "@/lib/garments";
import DesignPreview from "./DesignPreview";
import { CheckIcon } from "./icons";

interface Props {
  chosen: Design | null;
  /** Every design is drawn in this fabric, once there is one. */
  fabric: Fabric | null;
  scale: number;
  disabled: boolean;
  onPick: (design: Design) => void;
}

/** Step 1: which garment, and which design of it. */
export default function GarmentPane({ chosen, fabric, scale, disabled, onPick }: Props) {
  const [shownGender, setShownGender] = useState<Gender>(chosen?.gender ?? "male");
  const [shownType, setShownType] = useState(chosen?.typeId ?? CATALOGUE_TYPES[0].id);

  const designs = designsFor(shownGender, shownType);

  return (
    <section className="pane pane--garment" aria-labelledby="garment-title">
      <header className="pane__head">
        <span className="pane__num" aria-hidden="true">
          1
        </span>
        <h2 id="garment-title">The garment</h2>
      </header>

      <div className="filters">
        <fieldset className="seg">
          <legend className="sr-only">Who it is for</legend>
          {CATALOGUE_GENDERS.map((g) => (
            <label key={g.id} className="seg__item">
              <input
                type="radio"
                name="catalogue-gender"
                value={g.id}
                checked={shownGender === g.id}
                onChange={() => setShownGender(g.id)}
              />
              <span>{g.label}</span>
            </label>
          ))}
        </fieldset>
        <fieldset className="tabs">
          <legend className="sr-only">Garment type</legend>
          {CATALOGUE_TYPES.map((t) => (
            <label key={t.id} className="tabs__item">
              <input
                type="radio"
                name="catalogue-type"
                value={t.id}
                checked={shownType === t.id}
                onChange={() => setShownType(t.id)}
              />
              <span>{t.label}</span>
            </label>
          ))}
        </fieldset>
      </div>

      <ul className="shelf">
        {designs.map((design) => {
          const isChosen = chosen?.id === design.id;
          return (
            <li key={design.id}>
              <button
                type="button"
                className={isChosen ? "garment garment--chosen" : "garment"}
                aria-pressed={isChosen}
                disabled={disabled}
                onClick={() => onPick(design)}
              >
                <span className="garment__photo">
                  <DesignPreview template={design.thumb} fabric={fabric} scale={scale} />
                  {isChosen && (
                    <span className="garment__tick" aria-hidden="true">
                      <CheckIcon />
                    </span>
                  )}
                </span>
                <span className="garment__name">{design.name}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
