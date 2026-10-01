import { Header } from "./Header";
import { site } from "@/content/site";

export function Nav() {
  return <Header name={site.name} />;
}
