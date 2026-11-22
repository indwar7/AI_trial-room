"use client";

import { useEffect, useRef, useState } from "react";
import { GENDERS, typesFor, type Gender } from "@/lib/garments";
import type { Photo } from "@/lib/image";
import PhotoSlot from "./PhotoSlot";
import { DownloadIcon, HangerMark, PersonMark } from "./icons";

type Run =
  | { phase: "idle" }
  | { phase: "sending" }
  | { phase: "working"; id: string; status: "starting" | "processing"; progress: number | null }
  | { phase: "done"; id: string; url: string }
  | { phase: "error"; message: string };

interface StatusReply {
  status?: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  progress?: number | null;
  output?: string | null;
  error?: string | null;
}

const POLL_MS = 1500;
const GIVE_UP_MS = 8 * 60 * 1000;
const MAX_MISSED_POLLS = 6;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

  /** Bumped to abandon whichever try-on is in flight. */
  const ticket = useRef(0);
  const resultRef = useRef<HTMLElement>(null);

  const types = typesFor(gender);
  const type = types.find((t) => t.id === typeId) ?? null;
  const busy = run.phase === "sending" || run.phase === "working";

  const missing = [
    !person && "a photo of the person",
    !garment && "a photo of the garment",
    !gender && "male or female",
    !type && "the garment type",
  ].filter(Boolean) as string[];

  useEffect(() => () => void ticket.current++, []);

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
    const mine = ++ticket.current;
    const current = () => ticket.current === mine;

    setElapsed(0);
    setRun({ phase: "sending" });
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    resultRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });

    try {
      const res = await fetch("/api/tryon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          person: person.dataUrl,
          garment: garment.dataUrl,
          gender,
          type: type.id,
        }),
      });
      const created = (await res.json().catch(() => null)) as { id?: string; error?: string } | null;
      if (!current()) return;
      if (!res.ok || !created?.id) {
        throw new Error(created?.error ?? "The try-on could not be started. Try again.");
      }

      const id = created.id;
      setRun({ phase: "working", id, status: "starting", progress: null });

      const began = Date.now();
      let missed = 0;
      while (current()) {
        await sleep(POLL_MS);
        if (!current()) return;

        let reply: StatusReply | null = null;
        let ok = false;
        try {
          const poll = await fetch(`/api/tryon/${id}`, { cache: "no-store" });
          reply = (await poll.json().catch(() => null)) as StatusReply | null;
          ok = poll.ok;
        } catch {
          // A dropped connection on a phone; the try-on itself is still running.
        }
        if (!current()) return;

        if (!ok || !reply?.status) {
          if (++missed >= MAX_MISSED_POLLS) {
            throw new Error(reply?.error ?? "Lost contact with the AI service. Check your connection and try again.");
          }
          continue;
        }
        missed = 0;

        if (reply.status === "succeeded" && reply.output) {
          setRun({ phase: "done", id, url: reply.output });
          return;
        }
        if (reply.status === "starting" || reply.status === "processing") {
          setRun({ phase: "working", id, status: reply.status, progress: reply.progress ?? null });
        } else {
          throw new Error(reply.error ?? "The AI could not finish this try-on. Try again.");
        }

        if (Date.now() - began > GIVE_UP_MS) {
          void fetch(`/api/tryon/${id}`, { method: "DELETE" }).catch(() => undefined);
          throw new Error("This is taking too long. Try again in a minute.");
        }
      }
    } catch (err) {
      if (!current()) return;
      setRun({
        phase: "error",
        message: err instanceof Error ? err.message : "Something went wrong. Try again.",
      });
    }
  }

  function cancel() {
    ticket.current++;
    if (run.phase === "working") {
      void fetch(`/api/tryon/${run.id}`, { method: "DELETE" }).catch(() => undefined);
    }
    setRun({ phase: "idle" });
  }

  let statusLine = "";
  if (run.phase === "sending") statusLine = "Sending the photos…";
  if (run.phase === "working") {
    statusLine =
      run.status === "starting"
        ? "Waking the AI. The first try-on can take a minute or two."
        : "Fitting the garment…";
  }
  const percent = run.phase === "working" && run.status === "processing" ? run.progress : null;

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
              <div
                className={percent === null ? "meter meter--waiting" : "meter"}
                role="progressbar"
                aria-label="Try-on progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent ?? undefined}
              >
                <span style={percent === null ? undefined : { width: `${Math.max(percent, 4)}%` }} />
              </div>
              <p className="result__line">
                <span>
                  {statusLine}
                  {percent !== null && ` ${percent}%`}
                </span>
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
            <a className="btn btn--primary" href={`/api/tryon/${run.id}/download`} download>
              <DownloadIcon />
              Download the picture
            </a>
          )}
        </div>
      </section>
    </main>
  );
}
