// The only repositories the site may browse and serve files from: the lab notebook and published research.
// Product source code is never exposed here. Anything not listed — and anything GitHub reports as private — is refused.
export type CodeRepo = {
  slug: string; // /code/<slug>
  owner: string;
  repo: string;
  ref?: string; // defaults to the repo's default branch
  title: string;
  /** full name, shown under the short title */
  name?: string;
  blurb: string;
  group?: "Architectures & memory" | "Compression" | "Training";
};

const R = (slug: string, repo: string, title: string, name: string, blurb: string, group: CodeRepo["group"]): CodeRepo => ({
  slug, owner: "godsonj64", repo, title, name, blurb, group,
});

export const codeRepos: Record<string, CodeRepo> = {
  "nano-lab": {
    slug: "nano-lab",
    owner: "godsonj64",
    repo: "nano-lab",
    title: "nano-lab",
    blurb: "Open research on very small neural networks. Pushed to daily.",
  },
  // Blurbs are condensed from each repository's own README.
  dsor: R("dsor", "DSOR", "DSOR", "Dynamic Spatial Operator Routing",
    "DSORNet: a convolution-free image model that learns continuous, content-dependent sampling coordinates and carries fine-stage spatial trajectories into a coarse routing stage.", "Architectures & memory"),
  iarm: R("iarm", "IARM-Inductive-Algebraic-Resonance-Memory-Language-Model", "IARM", "Inductive Algebraic Resonance Memory",
    "A non-attention causal language model: no key projection, no query-key matrix, no softmax attention. Sequence mixing comes from operator-transformed queries and prefix-normalised memory scans.", "Architectures & memory"),
  "iarm-x": R("iarm-x", "IARM-X", "IARM-X", "Inductive Algebraic Resonance Attention Memory",
    "A research LM combining algebraic resonance operators, constant-state recurrent memory, query-addressable associative memory and sparse exact attention. A correctness-validated reference implementation.", "Architectures & memory"),
  arm: R("arm", "ARM", "ARM", "Algebraic Resonance Memory",
    "Transformation-mediated memory retrieval: a learned family of algebraic operators is applied to the query, and the resonance of every transformed path that reaches a memory atom is aggregated.", "Architectures & memory"),
  ean: R("ean", "evolutionary-abstraction-network", "EAN", "Evolutionary Abstraction Network",
    "Internal concepts as a dynamic population of abstractions rather than a fixed hidden layer, with a CNN-instantiated Vision-EAN as the tested visual variant.", "Architectures & memory"),
  akt: R("akt", "AKT-Adaptive-Kernalized-Transformer", "AKT", "Adaptive Kernel Transformer",
    "A transformer that replaces dot-product attention with a kernel-based attention module.", "Architectures & memory"),
  nqx: R("nqx", "NQX", "NanoQuant-X", "Binary and sub-1-bit LLM weights",
    "An extension of NanoQuant (ICML 2026) that closes the gap between the continuous factorisation objective and the signed, scaled weights actually deployed. CUDA kernels, NumPy reference, tests and benchmarks.", "Compression"),
  turbopress: R("turbopress", "turbopress", "TurboPress", "Low-bit LLM weight quantization",
    "Post-training weight quantization measured against TurboQuant: rotation, derived-exponent equilibration and trellis-coded quantization with Hessian error feedback, a packed Triton runtime and a KL/top-1/perplexity harness.", "Compression"),
  amac: R("amac", "AMaC-Optimizer", "AMaC", "Adaptive Momentum and Cosine Annealing",
    "A PyTorch optimizer combining adaptive momentum, warm-up, cosine annealing, gradient centralisation and SWA for steadier training.", "Training"),
};

export const LAB = codeRepos["nano-lab"];
export const RESEARCH = Object.values(codeRepos).filter((r) => r.slug !== "nano-lab");
