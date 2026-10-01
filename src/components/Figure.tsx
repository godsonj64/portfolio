/** The lone figure for scale — a recurring motif in the artwork. Decorative. */
export function Figure({ height = 30, className = "" }: { height?: number; className?: string }) {
  return (
    <svg viewBox="0 0 20 60" height={height} width={(height * 20) / 60} className={`figure ${className}`} aria-hidden="true" fill="currentColor">
      <circle cx="10" cy="6" r="4.6" />
      <path d="M5.5 14.5c1.4-1.4 3-2 4.5-2s3.1.6 4.5 2c1.1 1.1 1.7 2.6 1.9 4.7l.8 12.3c.1 1.3-1.9 1.5-2.1.2L13.6 24l-.2 12.2 1.1 21.6c.1 1.6-2.4 1.8-2.6.2L10 40.5 8.1 58c-.2 1.6-2.7 1.4-2.6-.2l1.1-21.6L6.4 24l-.9 7.5c-.2 1.3-2.2 1.1-2.1-.2l.8-12.4c.2-2.1.8-3.6 1.3-4.4Z" />
    </svg>
  );
}
