// Single place for identity + links. Edit here; nothing else hard-codes these.
export const site = {
  name: "Godson Johnson",
  handle: "godsonj64",
  title: "Godson Johnson — software that runs on your machine",
  description:
    "Five local-first desktop products — Cicada, Timbre, ElectroPlate, AXIO Medical and Talenta — and an open research lab for very small neural networks.",
  github: "https://github.com/godsonj64",
  // Public contact address, shown in the footer when set. Left empty on purpose: add one if you want it published.
  email: "" as string,
  url: process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000"),
};
