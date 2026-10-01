import { Header } from "./Header";
import { getHead } from "@/lib/github";
import { LAB } from "@/content/repos";
import { site } from "@/content/site";

export async function Nav() {
  // the "Lab pushed" chip is decorative: never let a GitHub hiccup take the whole page down with it
  const head = await getHead(LAB).catch(() => null);
  return <Header name={site.name} pushedIso={head?.date ?? null} />;
}
