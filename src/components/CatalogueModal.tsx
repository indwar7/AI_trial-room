"use client";

import { useEffect, useRef, useState } from "react";
import {
  CATALOGUE_GENDERS,
  CATALOGUE_TYPES,
  catalogueFor,
  type CatalogueItem,
} from "@/lib/catalogue";
import type { Gender } from "@/lib/garments";
import { photoFromFile, type Photo } from "@/lib/image";
import { CloseIcon } from "./icons";

interface Props {
  /** Where the catalogue opens: what is already chosen in the trial room. */
  gender: Gender | null;
  typeId: string | null;
  chosenId: string | null;
  onPick: (item: CatalogueItem, photo: Photo) => void;
  onClose: () => void;
}

export default function CatalogueModal({ gender, typeId, chosenId, onPick, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [shownGender, setShownGender] = useState<Gender>(gender ?? "male");
  const [shownType, setShownType] = useState(
    CATALOGUE_TYPES.some((t) => t.id === typeId) ? (typeId as string) : CATALOGUE_TYPES[0].id,
  );
  const [loading, setLoading] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const items = catalogueFor(shownGender, shownType);

  async function pick(item: CatalogueItem) {
    if (loading) return;
    setLoading(item.id);
    setProblem(null);
    try {
      const response = await fetch(item.image);
      if (!response.ok) throw new Error(String(response.status));
      onPick(item, await photoFromFile(await response.blob(), "garment"));
    } catch {
      setProblem("That garment could not be loaded. Check your internet connection and try again.");
      setLoading(null);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="catalogue"
      aria-labelledby="catalogue-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="catalogue__sheet">
        <div className="catalogue__bar">
          <h2 id="catalogue-title" className="catalogue__title">
            Catalogue
          </h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close catalogue">
            <CloseIcon />
          </button>
        </div>

        <div className="catalogue__filters">
          <fieldset className="choice">
            <legend className="sr-only">Who it is for</legend>
            <div className="choice__row">
              {CATALOGUE_GENDERS.map((g) => (
                <label key={g.id} className="pill">
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
            </div>
          </fieldset>
          <fieldset className="choice">
            <legend className="sr-only">Garment type</legend>
            <div className="choice__row">
              {CATALOGUE_TYPES.map((t) => (
                <label key={t.id} className="pill">
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
            </div>
          </fieldset>
        </div>

        {problem && (
          <p className="problem" role="alert">
            {problem}
          </p>
        )}

        <ul className="catalogue__grid">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={item.id === chosenId ? "garment garment--chosen" : "garment"}
                aria-pressed={item.id === chosenId}
                disabled={loading !== null}
                onClick={() => pick(item)}
              >
                <span className="garment__photo">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.thumb} alt="" width={384} height={512} loading="lazy" />
                  {loading === item.id && <span className="garment__wait">Loading…</span>}
                </span>
                <span className="garment__name">{item.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </dialog>
  );
}
