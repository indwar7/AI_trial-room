"use client";

import { useState } from "react";
import {
  CATALOGUE_GENDERS,
  CATALOGUE_TYPES,
  catalogueFor,
  type CatalogueItem,
} from "@/lib/catalogue";
import { typesFor, type Gender } from "@/lib/garments";
import { photoFromFile, type Photo } from "@/lib/image";
import PhotoButtons from "./PhotoButtons";
import { CheckIcon, HangerMark } from "./icons";

interface Props {
  garment: Photo | null;
  /** The catalogue garment in use. Null with a garment set means the store's own photo. */
  chosen: CatalogueItem | null;
  /** What the try-on is told about the garment. */
  gender: Gender;
  typeId: string;
  disabled: boolean;
  onPick: (item: CatalogueItem, photo: Photo) => void;
  onOwn: (photo: Photo, gender: Gender, typeId: string) => void;
  onDetails: (gender: Gender, typeId: string) => void;
}

/** Step 1: the catalogue, laid out to browse, with room for the store's own garment. */
export default function GarmentPane({
  garment,
  chosen,
  gender,
  typeId,
  disabled,
  onPick,
  onOwn,
  onDetails,
}: Props) {
  const [shownGender, setShownGender] = useState<Gender>(gender);
  const [shownType, setShownType] = useState(
    CATALOGUE_TYPES.some((t) => t.id === typeId) ? typeId : CATALOGUE_TYPES[0].id,
  );
  const [loading, setLoading] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const items = catalogueFor(shownGender, shownType);
  const own = garment !== null && chosen === null;
  const ownTypes = typesFor(gender);

  async function pick(item: CatalogueItem) {
    if (loading || disabled) return;
    setLoading(item.id);
    setProblem(null);
    try {
      const response = await fetch(item.image);
      if (!response.ok) throw new Error(String(response.status));
      onPick(item, await photoFromFile(await response.blob(), "garment"));
    } catch {
      setProblem("That garment could not be loaded. Check your internet connection and try again.");
    } finally {
      setLoading(null);
    }
  }

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

      {problem && (
        <p className="problem" role="alert">
          {problem}
        </p>
      )}

      <ul className="shelf">
        {items.map((item) => {
          const isChosen = chosen?.id === item.id;
          return (
            <li key={item.id}>
              <button
                type="button"
                className={isChosen ? "garment garment--chosen" : "garment"}
                aria-pressed={isChosen}
                disabled={disabled || loading !== null}
                onClick={() => pick(item)}
              >
                <span className="garment__photo">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.thumb} alt="" width={384} height={512} loading="lazy" />
                  {loading === item.id && <span className="garment__wait">Loading…</span>}
                  {isChosen && (
                    <span className="garment__tick" aria-hidden="true">
                      <CheckIcon />
                    </span>
                  )}
                </span>
                <span className="garment__name">{item.name}</span>
              </button>
            </li>
          );
        })}

        <li>
          <div className={own ? "garment garment--own garment--chosen" : "garment garment--own"}>
            <span className="garment__photo">
              {own && garment ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={garment.dataUrl} alt="Your photo of the garment" />
                  <span className="garment__tick" aria-hidden="true">
                    <CheckIcon />
                  </span>
                </>
              ) : (
                <span className="garment__own-empty">
                  <HangerMark />
                  <span>Your own garment</span>
                  <small>Laid flat, plain background</small>
                </span>
              )}
            </span>
            <PhotoButtons
              kind="garment"
              subject="your garment"
              cameraHint="Lay the garment flat and fill the frame with it."
              hasPhoto={own}
              disabled={disabled}
              compact
              onPhoto={(photo) => onOwn(photo, shownGender, shownType)}
            />
          </div>
        </li>
      </ul>

      {own && (
        <div className="own-details">
          <p>Your garment is a</p>
          <label>
            <span className="sr-only">Who it is for</span>
            <select
              value={gender}
              disabled={disabled}
              onChange={(e) => {
                const next = e.target.value as Gender;
                const stillFits = typesFor(next).some((t) => t.id === typeId);
                onDetails(next, stillFits ? typeId : typesFor(next)[0].id);
              }}
            >
              <option value="male">men&apos;s</option>
              <option value="female">women&apos;s</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Garment type</span>
            <select
              value={typeId}
              disabled={disabled}
              onChange={(e) => onDetails(gender, e.target.value)}
            >
              {ownTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label.toLowerCase()}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
    </section>
  );
}
