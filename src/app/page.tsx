import TrialRoom from "@/components/TrialRoom";

export default function Home() {
  return (
    <>
      <header className="top">
        <span className="top__mark">AI Trial Room</span>
        <span className="eyebrow">Virtual fitting</span>
      </header>

      <div className="intro">
        <h1>Try it on without putting it on.</h1>
        <p>
          Take a photo of the person, take a photo of the garment, and the AI shows the
          garment fitted on them.
        </p>
      </div>

      <TrialRoom />

      <footer className="foot">
        <p>
          Photos are sent to a public AI demo server on Hugging Face to make this picture. This
          site does not keep them. Free try-ons are limited each day.
        </p>
      </footer>
    </>
  );
}
