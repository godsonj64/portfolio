/** Pre-highlighted source with a line-number gutter and #L12 anchors. Highlighting happens on the server. */
export function CodeView({ lines }: { lines: string[] }) {
  return (
    <div className="code-view">
      <div className="gutter" aria-hidden>
        {lines.map((_, i) => (
          <a key={i} id={`L${i + 1}`} href={`#L${i + 1}`}>{i + 1}</a>
        ))}
      </div>
      <pre className="lines"><code dangerouslySetInnerHTML={{ __html: lines.join("\n") }} /></pre>
    </div>
  );
}
