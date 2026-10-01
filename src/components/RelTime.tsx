"use client";

import { useEffect, useState } from "react";
import { ago, shortDate } from "@/lib/fmt";

/** Server renders an absolute date (cache-safe); the browser upgrades it to a live "3h ago". */
export function RelTime({ iso }: { iso: string }) {
  const [text, setText] = useState(() => shortDate(iso));
  useEffect(() => {
    const tick = () => setText(ago(iso));
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [iso]);
  return <time dateTime={iso}>{text}</time>;
}
