/** Brand mark: a lemniscate, the same curve the loader's comet travels. */
export function Mark({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 40" width={size * 1.6} height={size} aria-hidden="true" className="mark">
      <defs>
        <linearGradient id="mk" x1="2" y1="0" x2="62" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#8b7bff" />
          <stop offset=".5" stopColor="#ececff" />
          <stop offset="1" stopColor="#3ee0d0" />
        </linearGradient>
      </defs>
      <path
        d="M32 20c-5.2-7.4-9.6-10.6-14.2-10.6C12.4 9.4 8.6 14 8.6 20s3.8 10.6 9.2 10.6c4.6 0 9-3.2 14.2-10.6s9.6-10.6 14.2-10.6c5.4 0 9.2 4.6 9.2 10.6s-3.8 10.6-9.2 10.6c-4.6 0-9-3.2-14.2-10.6Z"
        fill="none"
        stroke="url(#mk)"
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
