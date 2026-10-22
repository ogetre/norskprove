"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

/** «Meld feil»: tells the owner about an error in a task, with the page it was found on. */
export function ReportProblem({ taskId }: { taskId: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | { error: string }>("idle");

  if (state === "sent") {
    return <p className="mt-10 text-sm text-granite">Takk! Vi ser på det og retter feilen.</p>;
  }
  if (!open) {
    return (
      <p className="mt-10 text-sm text-granite">
        Har du funnet en feil i oppgaven?{" "}
        <button type="button" onClick={() => setOpen(true)} className="font-medium text-fjord underline-offset-4 hover:underline">
          Meld fra
        </button>
      </p>
    );
  }

  const send = async () => {
    setState("sending");
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, taskId, message }),
    }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { error?: string } | null;
    setState(res?.ok ? "sent" : { error: data?.error ?? "Fikk ikke sendt. Prøv igjen." });
  };

  return (
    <form
      className="mt-10 max-w-xl rounded-2xl bg-surface p-5 ring-1 ring-ice"
      onSubmit={(e) => {
        e.preventDefault();
        void send();
      }}
    >
      <label htmlFor="report" className="font-semibold">
        Hva er feil?
      </label>
      <p className="mt-1 text-sm text-granite">For eksempel en skrivefeil, et svar som ikke stemmer, eller lyd som ikke virker.</p>
      <textarea
        id="report"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={1500}
        rows={4}
        required
        className="mt-3 block w-full rounded-lg border border-ice bg-snow px-3 py-2 focus:border-fjord focus:outline-none"
      />
      {typeof state === "object" && (
        <p className="mt-2 text-sm text-rorbu" role="alert">
          {state.error}
        </p>
      )}
      <div className="mt-3 flex gap-3">
        <button
          type="submit"
          disabled={state === "sending" || message.trim().length < 3}
          className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-snow transition-colors hover:bg-fjord disabled:opacity-50"
        >
          {state === "sending" ? "Sender …" : "Send"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-md px-4 py-2 text-sm text-granite hover:text-ink">
          Avbryt
        </button>
      </div>
    </form>
  );
}
