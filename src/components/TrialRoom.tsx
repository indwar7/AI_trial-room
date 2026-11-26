"use client";

import { useEffect, useRef, useState } from "react";
import type { CatalogueItem } from "@/lib/catalogue";
import { GENDERS, typesFor, type Category, type Gender } from "@/lib/garments";
import type { Photo } from "@/lib/image";
import { inPhoneApp, sharePicture } from "@/lib/native";
import { runTryOn, type Stage } from "@/lib/tryon";
import CatalogueModal from "./CatalogueModal";
import PhotoSlot from "./PhotoSlot";
import { DownloadIcon, GridIcon, HangerMark, PersonMark } from "./icons";

type Run =
  | { phase: "idle" }
  | { phase: "working"; stage: Stage }
  | { phase: "done"; url: string }
  | { phase: "error"; message: string };

const PICTURE_NAME = "mirror-fit-try-on.jpg";

/** How the garment types are laid out in step 3. */
const TYPE_GROUPS: readonly { label: string; categories: readonly Category[] }[] = [
  { label: "Tops", categories: ["upper_body"] },
  { label: "Bottoms and dresses", categories: ["lower_body", "dresses"] },
];

function clock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function TrialRoom() {
  const [person, setPerson] = useState<Photo | null>(null);
  const [garment, setGarment] = useState<Photo | null>(null);
  /** The catalogue garment in the frame, when that is where the photo came from. */
  const [chosen, setChosen] = useState<CatalogueItem | null>(null);
  const [catalogueOpen, setCatalogueOpen] = useState(false);
  const [gender, setGender] = useState<Gender | null>(null);
  const [typeId, setTypeId] = useState<string | null>(null);
  const [run, setRun] = useState<Run>({ phase: "idle" });
  const [elapsed, setElapsed] = useState(0);
  const [shareProblem, setShareProblem] = useState<string | null>(null);
  /** With a result on screen: look at the photo it was made from instead. */
  const [showOriginal, setShowOriginal] = useState(false);

  /** Stops whichever try-on is in flight. */
  const inFlight = useRef<AbortController | null>(null);
  /** The picture on screen, held so it can be released. */
  const pictureUrl = useRef<string | null>(null);
  const resultRef = useRef<HTMLElement>(null);

  const types = typesFor(gender);
  const type = types.find((t) => t.id === typeId) ?? null;
  const busy = run.phase === "working";
  /** Trousers, skirts and dresses can only be fitted when the legs are in the photo. */
  const wholeBody = !!type && type.category !== "upper_body";

  const missing = [
    !person && "a photo of the person",
    !garment && "a photo of the garment",
    !gender && "male or female",
    !type && "the garment type",
  ].filter(Boolean) as string[];

  useEffect(
    () => () => {
      inFlight.current?.abort();
      if (pictureUrl.current) URL.revokeObjectURL(pictureUrl.current);
    },
    [],
  );

  useEffect(() => {
    if (!busy) return;
    const started = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [busy]);

  /** A changed input makes the picture on screen out of date. */
  function clearResult() {
    if (run.phase === "done" || run.phase === "error") setRun({ phase: "idle" });
  }

  function chooseGender(next: Gender) {
    setGender(next);
    if (typeId && !typesFor(next).some((t) => t.id === typeId)) setTypeId(null);
    clearResult();
  }

  async function start() {
    if (!person || !garment || !gender || !type || busy) return;
    const controller = new AbortController();
    inFlight.current = controller;
    const current = () => inFlight.current === controller && !controller.signal.aborted;

    setElapsed(0);
    setShareProblem(null);
    setShowOriginal(false);
    setRun({ phase: "working", stage: { step: "connecting" } });
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    resultRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });

    try {
      const picture = await runTryOn({
        person,
        garment,
        gender,
        type,
        signal: controller.signal,
        onStage: (stage) => {
          if (current()) setRun({ phase: "working", stage });
        },
      });
      if (!current()) return;
      if (pictureUrl.current) URL.revokeObjectURL(pictureUrl.current);
      pictureUrl.current = URL.createObjectURL(picture);
      setRun({ phase: "done", url: pictureUrl.current });
    } catch (err) {
      if (!current()) return;
      setRun({
        phase: "error",
        message: err instanceof Error ? err.message : "Something went wrong. Try again.",
      });
    }
  }

  async function share(url: string) {
    setShareProblem(null);
    try {
      await sharePicture(url, PICTURE_NAME);
    } catch {
      setShareProblem("The picture could not be shared. Take a screenshot instead.");
    }
  }

  function cancel() {
    inFlight.current?.abort();
    inFlight.current = null;
    setRun({ phase: "idle" });
  }

  let statusLine = "";
  if (run.phase === "working") {
    const { stage } = run;
    if (stage.step === "connecting") statusLine = "Connecting to the free AI server…";
    else if (stage.step === "queued") statusLine = `In the queue, ${stage.ahead} ahead of you…`;
    else statusLine = "Fitting the garment…";
  }

  return (
    <main className="room">
      <div className="room__inputs">
        <div className="slots">
          <PhotoSlot
            kind="person"
            step="Step 1"
            title="The person"
            hint={
              wholeBody
                ? "Standing straight, facing the camera, the whole body in view from head to feet."
                : "Standing straight, facing the camera, head to hips in view."
            }
            cameraHint={
              wholeBody
                ? "Stand straight, face the camera, keep the whole body in the frame, head to feet."
                : "Stand straight, face the camera, keep head to hips in the frame."
            }
            caption={
              wholeBody ? "This garment needs a full-length photo, head to feet." : undefined
            }
            placeholder={<PersonMark />}
            photo={person}
            disabled={busy}
            onPhoto={(p) => {
              setPerson(p);
              clearResult();
            }}
          />
          <PhotoSlot
            kind="garment"
            step="Step 2"
            title="The garment"
            hint="Choose one from the catalogue, or photograph your own laid flat on a plain background."
            cameraHint="Lay the garment flat and fill the frame with it."
            placeholder={<HangerMark />}
            caption={chosen?.name}
            extraAction={
              <button
                type="button"
                className="btn btn--ink"
                disabled={busy}
                onClick={() => setCatalogueOpen(true)}
              >
                <GridIcon />
                Catalogue
              </button>
            }
            photo={garment}
            disabled={busy}
            onPhoto={(p) => {
              setGarment(p);
              setChosen(null);
              clearResult();
            }}
          />
        </div>

        <section className="details" aria-labelledby="details-title">
          <p className="eyebrow">Step 3</p>
          <h2 id="details-title" className="slot__title">
            The details
          </h2>
          {chosen && (
            <p className="details__note">Filled in from the catalogue. Change them if they are wrong.</p>
          )}

          <fieldset className="choice" disabled={busy}>
            <legend>Who is wearing it</legend>
            <div className="choice__row">
              {GENDERS.map((g) => (
                <label key={g.id} className="pill">
                  <input
                    type="radio"
                    name="gender"
                    value={g.id}
                    checked={gender === g.id}
                    onChange={() => chooseGender(g.id)}
                  />
                  <span>{g.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="choice" disabled={busy}>
            <legend>What the garment is</legend>
            {TYPE_GROUPS.map((group) => {
              const inGroup = types.filter((t) => group.categories.includes(t.category));
              if (inGroup.length === 0) return null;
              return (
                <div key={group.label} className="choice__group">
                  <p className="choice__label">{group.label}</p>
                  <div className="choice__row">
                    {inGroup.map((t) => (
                      <label key={t.id} className="pill">
                        <input
                          type="radio"
                          name="type"
                          value={t.id}
                          checked={typeId === t.id}
                          onChange={() => {
                            setTypeId(t.id);
                            clearResult();
                          }}
                        />
                        <span>{t.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </fieldset>
        </section>

        <div className="go">
          <button
            type="button"
            className="btn btn--primary btn--large"
            onClick={start}
            disabled={busy || missing.length > 0}
          >
            {busy ? "Working…" : run.phase === "done" ? "Try it on again" : "Try it on"}
          </button>
          {missing.length > 0 && <p className="go__missing">Still needed: {missing.join(", ")}.</p>}
        </div>
      </div>

      <section className="result" ref={resultRef} aria-labelledby="result-title">
        <p className="eyebrow">The result</p>
        <h2 id="result-title" className="slot__title">
          The fitted look
        </h2>

        <div
          className={run.phase === "done" ? "frame frame--result frame--filled" : "frame frame--result"}
          style={person ? { aspectRatio: `${person.width} / ${person.height}` } : undefined}
        >
          {run.phase === "done" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="frame__img"
              src={showOriginal && person ? person.dataUrl : run.url}
              alt={
                showOriginal
                  ? "The photo of the person, before the try-on"
                  : `The person wearing the ${type ? type.label.toLowerCase() : "garment"}`
              }
            />
          ) : (
            <>
              {busy && person && (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="frame__img frame__img--waiting" src={person.dataUrl} alt="" />
              )}
              {busy && <div className="frame__sweep" aria-hidden="true" />}
              {!busy && (
                <div className="frame__empty">
                  <p>
                    {run.phase === "error"
                      ? "No picture this time."
                      : "The person wearing the garment appears here."}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="result__status" aria-live="polite">
          {busy && (
            <>
              <div className="meter meter--waiting" role="progressbar" aria-label="Try-on progress">
                <span />
              </div>
              <p className="result__line">
                <span>{statusLine}</span>
                <span className="result__clock">{clock(elapsed)}</span>
              </p>
              <p className="result__note">This usually takes about half a minute.</p>
              <button type="button" className="btn btn--quiet" onClick={cancel}>
                Cancel
              </button>
            </>
          )}

          {run.phase === "error" && (
            <p className="problem" role="alert">
              {run.message}
            </p>
          )}

          {run.phase === "done" && (
            <>
              <div className="compare" role="group" aria-label="Which picture to show">
                <button
                  type="button"
                  className="compare__side"
                  aria-pressed={!showOriginal}
                  onClick={() => setShowOriginal(false)}
                >
                  Fitted look
                </button>
                <button
                  type="button"
                  className="compare__side"
                  aria-pressed={showOriginal}
                  onClick={() => setShowOriginal(true)}
                >
                  Original photo
                </button>
              </div>
              <div className="result__actions">
                {inPhoneApp() ? (
                  <button type="button" className="btn btn--primary" onClick={() => share(run.url)}>
                    <DownloadIcon />
                    Save or share the picture
                  </button>
                ) : (
                  <a className="btn btn--primary" href={run.url} download={PICTURE_NAME}>
                    <DownloadIcon />
                    Download the picture
                  </a>
                )}
                <button type="button" className="btn" onClick={() => setCatalogueOpen(true)}>
                  <GridIcon />
                  Try another garment
                </button>
              </div>
            </>
          )}
          {shareProblem && (
            <p className="problem" role="alert">
              {shareProblem}
            </p>
          )}
        </div>
      </section>

      {catalogueOpen && (
        <CatalogueModal
          gender={gender}
          typeId={typeId}
          chosenId={chosen?.id ?? null}
          onPick={(item, photo) => {
            // A catalogue garment already says who it is for and what it is.
            setGarment(photo);
            setChosen(item);
            setGender(item.gender);
            setTypeId(item.typeId);
            clearResult();
            setCatalogueOpen(false);
          }}
          onClose={() => setCatalogueOpen(false)}
        />
      )}
    </main>
  );
}
