"use client";

import { useState } from "react";

/** Copies a file's raw text. Fetches it from our own /api/raw route on demand, so nothing is embedded in the page. */
export function CopyButton({ href, label = "Copy" }: { href: string; label?: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "err">("idle");
  const copy = async () => {
    setState("busy");
    try {
      const text = await (await fetch(href)).text();
      await navigator.clipboard.writeText(text);
      setState("done");
    } catch {
      setState("err");
    }
    setTimeout(() => setState("idle"), 1800);
  };
  return (
    <button type="button" className="tool" onClick={copy} disabled={state === "busy"}>
      {state === "done" ? "Copied" : state === "err" ? "Couldn’t copy" : label}
    </button>
  );
}
