const IMG: Record<string, string> = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", avif: "image/avif",
  svg: "image/svg+xml", ico: "image/x-icon", bmp: "image/bmp",
};
const BINARY = new Set([
  "zip", "gz", "tgz", "tar", "7z", "rar", "pt", "pth", "bin", "ckpt", "safetensors", "npz", "npy", "onnx", "gguf", "pdf", "mp4", "mov",
  "webm", "mp3", "wav", "flac", "ttf", "otf", "woff", "woff2", "exe", "dll", "so", "dylib", "dmg", "parquet", "pkl", "pickle", "h5",
  "hdf5", "mlmodel", "tflite", "mlpackage", "pyc", "whl", "jar",
]);

export const extOf = (path: string) => {
  const base = path.split("/").pop() ?? "";
  return base.includes(".") ? base.split(".").pop()!.toLowerCase() : "";
};

export type FileKind = "image" | "markdown" | "notebook" | "binary" | "text";
export function kindOf(path: string): FileKind {
  const e = extOf(path);
  if (e in IMG) return "image";
  if (e === "md" || e === "markdown" || e === "mdx") return "markdown";
  if (e === "ipynb") return "notebook";
  if (BINARY.has(e)) return "binary";
  return "text";
}

/** Content-Type for the raw proxy. Anything that could execute in a browser is downgraded to text/plain. */
export function mimeFor(path: string): string {
  const e = extOf(path);
  if (e in IMG) return IMG[e];
  if (e === "pdf") return "application/pdf";
  if (e === "json" || e === "ipynb") return "application/json; charset=utf-8";
  if (BINARY.has(e)) return "application/octet-stream";
  return "text/plain; charset=utf-8";
}

export const isCompressible = (path: string) => {
  const e = extOf(path);
  return !(e in IMG) && !BINARY.has(e);
};
