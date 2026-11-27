"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { DEFAULT_FABRIC_SCALE, type Design } from "@/lib/catalogue";
import { garmentPhoto, type Fabric } from "@/lib/fabric";
import { findType } from "@/lib/garments";
import type { Photo } from "@/lib/image";
import { inPhoneApp, sharePicture } from "@/lib/native";
import { runTryOn, type Stage } from "@/lib/tryon";
import DesignPreview from "./DesignPreview";
import FabricPane from "./FabricPane";
import GarmentPane from "./GarmentPane";
import PhotoButtons from "./PhotoButtons";
import { CheckIcon, DownloadIcon, HangerMark, PersonMark } from "./icons";

type Run =
  | { phase: "idle" }
  | { phase: "working"; stage: Stage }
  | { phase: "done"; url: string }
  | { phase: "error"; message: string };

/** On a phone one step is on screen at a time; on a wide screen all four are. */
type Step = "garment" | "fabric" | "person" | "result";

const STEPS: readonly { id: Step; label: string }[] = [
  { id: "garment", label: "Garment" },
  { id: "fabric", label: "Fabric" },
  { id: "person", label: "Photo" },
  { id: "result", label: "Result" },
];

const PICTURE_NAME = "mirror-fit-try-on.jpg";
const NARROW = "(max-width: 1279px)";

function clock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function watchNarrow(onChange: () => void): () => void {
  const query = window.matchMedia(NARROW);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export default function TrialRoom() {
  const [person, setPerson] = useState<Photo | null>(null);
  /** Which garment, in which design. */
  const [design, setDesign] = useState<Design | null>(null);
  /** What it is made in, and how big the fabric's pattern sits on it. */
  const [fabric, setFabric] = useState<Fabric | null>(null);
  const [scale, setScale] = useState(DEFAULT_FABRIC_SCALE);
  const [step, setStep] = useState<Step>("garment");
  const [run, setRun] = useState<Run>({ phase: "idle" });
  const [elapsed, setElapsed] = useState(0);
  const [shareProblem, setShareProblem] = useState<string | null>(null);
  /** With a result on screen: look at the photo it was made from instead. */
  const [showOriginal, setShowOriginal] = useState(false);

  /** Stops whichever try-on is in flight. */
  const inFlight = useRef<AbortController | null>(null);
  /** The picture on screen, held so it can be released. */
  const pictureUrl = useRef<string | null>(null);

  const narrow = useSyncExternalStore(
    watchNarrow,
    () => window.matchMedia(NARROW).matches,
    () => false,
  );

  const type = design ? findType(design.typeId) : undefined;
  const busy = run.phase === "working";
  const ready = person !== null && design !== null && fabric !== null && type !== undefined;
  /** Trousers can only be fitted when the legs are in the photo. */
  const wholeBody = type !== undefined && type.category !== "upper_body";

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

  function go(next: Step) {
    setStep(next);
    // Each step starts at its top, whatever the last one was scrolled to.
    window.scrollTo({ top: 0 });
  }

  async function start() {
    if (!person || !design || !fabric || !type || busy) return;
    const controller = new AbortController();
    inFlight.current = controller;
    const current = () => inFlight.current === controller && !controller.signal.aborted;

    setElapsed(0);
    setShareProblem(null);
    setShowOriginal(false);
    setRun({ phase: "working", stage: { step: "connecting" } });
    go("result");

    try {
      const picture = await runTryOn({
        person,
        garment: await garmentPhoto(design, fabric, scale),
        gender: design.gender,
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

  /**
   * The one main button. On a wide screen it only ever starts the try-on. On
   * a phone it also leads to whichever step still has something missing.
   */
  let main: { label: string; act?: () => void };
  if (busy) main = { label: "Working…" };
  else if (ready) main = { label: run.phase === "done" ? "Try it on again" : "Try it on", act: start };
  else if (!narrow) main = { label: "Try it on" };
  else if (!design) {
    main = step === "garment" ? { label: "Choose a garment" } : { label: "Choose a garment", act: () => go("garment") };
  } else if (!fabric) {
    main = step === "fabric" ? { label: "Add the fabric" } : { label: "Next: fabric", act: () => go("fabric") };
  } else {
    main =
      step === "person"
        ? { label: "Add the customer's photo" }
        : { label: "Next: customer's photo", act: () => go("person") };
  }

  const toDo = [
    !design && "choose a garment",
    !fabric && "add the fabric",
    !person && "add the customer's photo",
  ].filter(Boolean) as string[];
  const hint = toDo.length > 0 ? `Still to do: ${toDo.join(", ")}.` : "";

  const finished: Record<Step, boolean> = {
    garment: design !== null,
    fabric: fabric !== null,
    person: person !== null,
    result: run.phase === "done",
  };

  return (
    <main className="studio" data-step={step}>
      <nav className="steps" aria-label="Steps">
        {STEPS.map((s, index) => (
          <button
            key={s.id}
            type="button"
            className="steps__item"
            aria-current={step === s.id ? "step" : undefined}
            disabled={busy}
            onClick={() => go(s.id)}
          >
            <span className="steps__num" aria-hidden="true">
              {finished[s.id] ? <CheckIcon /> : index + 1}
            </span>
            {s.label}
          </button>
        ))}
      </nav>

      <GarmentPane
        chosen={design}
        fabric={fabric}
        scale={scale}
        disabled={busy}
        onPick={(picked) => {
          setDesign(picked);
          clearResult();
        }}
      />

      <FabricPane
        design={design}
        fabric={fabric}
        scale={scale}
        disabled={busy}
        onFabric={(picked, itsScale) => {
          setFabric(picked);
          setScale(itsScale);
          clearResult();
        }}
        onScale={(next) => {
          setScale(next);
          clearResult();
        }}
      />

      <section className="pane pane--person" aria-labelledby="person-title">
        <header className="pane__head">
          <span className="pane__num" aria-hidden="true">
            3
          </span>
          <h2 id="person-title">The customer</h2>
        </header>

        <div className={person ? "stage stage--filled" : "stage"}>
          {person ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="stage__img" src={person.dataUrl} alt="Your photo of the customer" />
          ) : (
            <div className="stage__empty">
              <PersonMark />
              <p>
                {wholeBody
                  ? "Standing straight, facing the camera, the whole body in view from head to feet."
                  : "Standing straight, facing the camera, head to hips in view."}
              </p>
            </div>
          )}
        </div>

        {wholeBody && (
          <p className="pane__note">This garment needs a full-length photo, head to feet.</p>
        )}

        <PhotoButtons
          kind="person"
          subject="the customer"
          cameraHint={
            wholeBody
              ? "Stand straight, face the camera, keep the whole body in the frame, head to feet."
              : "Stand straight, face the camera, keep head to hips in the frame."
          }
          hasPhoto={person !== null}
          disabled={busy}
          onPhoto={(photo) => {
            setPerson(photo);
            clearResult();
          }}
        />
      </section>

      <section className="pane pane--result" aria-labelledby="result-title">
        <header className="pane__head">
          <span className="pane__num" aria-hidden="true">
            4
          </span>
          <h2 id="result-title">The fitted look</h2>
        </header>

        <div className={run.phase === "done" ? "stage stage--filled" : "stage"}>
          {run.phase === "done" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="stage__img stage__img--result"
              src={showOriginal && person ? person.dataUrl : run.url}
              alt={
                showOriginal
                  ? "The photo of the customer, before the try-on"
                  : `The customer wearing the ${type ? type.label.toLowerCase() : "garment"}`
              }
            />
          ) : (
            <>
              {busy && person && (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="stage__img stage__img--waiting" src={person.dataUrl} alt="" />
              )}
              {busy && <div className="stage__sweep" aria-hidden="true" />}
              {!busy && (
                <div className="stage__empty">
                  <p>
                    {run.phase === "error"
                      ? "No picture this time."
                      : "The customer wearing the garment appears here."}
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
                  <button type="button" className="btn btn--ink" onClick={() => share(run.url)}>
                    <DownloadIcon />
                    Save or share
                  </button>
                ) : (
                  <a className="btn btn--ink" href={run.url} download={PICTURE_NAME}>
                    <DownloadIcon />
                    Download
                  </a>
                )}
                <button type="button" className="btn" onClick={() => go("garment")}>
                  New garment
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

      <div className="bar">
        <div className="bar__picks" aria-hidden="true">
          <span className={design ? "bar__thumb bar__thumb--filled" : "bar__thumb"}>
            {design ? (
              <DesignPreview template={design.thumb} fabric={fabric} scale={scale} width={96} height={128} />
            ) : (
              <HangerMark />
            )}
          </span>
          <span className={person ? "bar__thumb bar__thumb--filled" : "bar__thumb"}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {person ? <img src={person.dataUrl} alt="" /> : <PersonMark />}
          </span>
        </div>
        <div className="go">
          <button
            type="button"
            className="btn btn--primary btn--large"
            onClick={main.act}
            disabled={!main.act}
          >
            {main.label}
          </button>
        </div>
        {hint && !busy && <p className="bar__hint">{hint}</p>}
      </div>
    </main>
  );
}
