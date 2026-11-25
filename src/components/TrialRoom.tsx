"use client";

import { useEffect, useRef, useState } from "react";
import { GENDERS, typesFor, type Gender } from "@/lib/garments";
import type { Photo } from "@/lib/image";
import { runTryOn, type Stage } from "@/lib/tryon";
import PhotoSlot from "./PhotoSlot";
import { DownloadIcon, HangerMark, PersonMark } from "./icons";

type Run =
  | { phase: "idle" }
  | { phase: "working"; stage: Stage }
  | { phase: "done"; url: string }
  | { phase: "error"; message: string };

function clock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function TrialRoom() {
  const [person, setPerson] = useState<Photo | null>(null);
  const [garment, setGarment] = useState<Photo | null>(null);
  const [gender, setGender] = useState<Gender | null>(null);
  const [typeId, setTypeId] = useState<string | null>(null);
  const [run, setRun] = useState<Run>({ phase: "idle" });
  const [elapsed, setElapsed] = useState(0);

  /** Stops whichever try-on is in flight. */
  const inFlight = useRef<AbortController | null>(null);
  /** The picture on screen, held so it can be released. */
  const pictureUrl = useRef<string | null>(null);
  const resultRef = useRef<HTMLElement>(null);

  const types = typesFor(gender);
  const type = types.find((t) => t.id === typeId) ?? null;
  const busy = run.phase === "working";

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
            hint="Standing straight, facing the camera, head to hips in view."
            cameraHint="Stand straight, face the camera, keep head to hips in the frame."
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
            hint="Laid flat or on a hanger, the whole garment in view, plain background."
            cameraHint="Lay the garment flat and fill the frame with it."
            placeholder={<HangerMark />}
            photo={garment}
            disabled={busy}
            onPhoto={(p) => {
              setGarment(p);
              clearResult();
            }}
          />
        </div>

        <section className="details" aria-labelledby="details-title">
          <p className="eyebrow">Step 3</p>
          <h2 id="details-title" className="slot__title">
            The details
          </h2>

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
            <div className="choice__row">
              {types.map((t) => (
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
              src={run.url}
              alt={`The person wearing the ${type ? type.label.toLowerCase() : "garment"}`}
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
            <a className="btn btn--primary" href={run.url} download="mirror-fit-try-on.jpg">
              <DownloadIcon />
              Download the picture
            </a>
          )}
        </div>
      </section>
    </main>
  );
}
