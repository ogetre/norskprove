"use client";

/** Offered when an unfinished full test is saved on this device: continue it or start over. */
export function ResumeCard({
  label,
  heading = "Du har en uferdig delprøve",
  details,
  onContinue,
  onRestart,
}: {
  label: string;
  heading?: string;
  details: string[];
  onContinue: () => void;
  onRestart: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl rounded-2xl bg-surface p-7 ring-1 ring-ice sm:p-10">
      <p className="text-sm text-granite">{label}</p>
      <h1 className="mt-2 font-display text-3xl font-medium tracking-tight">{heading}</h1>
      <ul className="mt-6 space-y-2 leading-relaxed">
        {details.map((d) => (
          <li key={d} className="flex gap-3">
            <span aria-hidden="true" className="mt-2.5 size-1.5 shrink-0 rounded-full bg-rorbu" />
            <span className="text-granite">{d}</span>
          </li>
        ))}
      </ul>
      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onContinue}
          className="rounded-md bg-rorbu px-7 py-3.5 font-medium text-white transition-colors hover:bg-[#a03022]"
        >
          Fortsett der du slapp
        </button>
        <button
          type="button"
          onClick={onRestart}
          className="rounded-md px-6 py-3.5 font-medium text-granite ring-1 ring-ice transition-colors hover:text-ink"
        >
          Start en ny
        </button>
      </div>
      <p className="mt-4 text-sm text-granite">Hvis du starter en ny, blir den uferdige slettet.</p>
    </div>
  );
}
