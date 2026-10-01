// The only repositories the site may browse and serve files from: the research lab.
// Product source code is never exposed here. Anything not listed — and anything GitHub reports as private — is refused.
export type CodeRepo = {
  slug: string; // /code/<slug>
  owner: string;
  repo: string;
  ref?: string; // defaults to the repo's default branch
  title: string;
  blurb: string;
};

export const codeRepos: Record<string, CodeRepo> = {
  "nano-lab": {
    slug: "nano-lab",
    owner: "godsonj64",
    repo: "nano-lab",
    title: "nano-lab",
    blurb: "Open research on very small neural networks. Pushed to daily.",
  },
};

export const LAB = codeRepos["nano-lab"];
