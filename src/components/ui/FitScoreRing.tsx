type Props = {
  score: number;
  size?: number;
  stroke?: number;
  label?: string;
};

/** Circular fit-score gauge. Green ≥ 75, amber ≥ 50, else muted. */
export function FitScoreRing({ score, size = 72, stroke = 6, label = "fit" }: Props) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(Math.max(score, 0), 100) / 100);
  const color =
    score >= 75 ? "var(--color-accent)" : score >= 50 ? "var(--color-warn)" : "var(--color-muted)";

  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute text-center leading-none">
        <span className="block text-lg font-semibold tabular-nums">{score}</span>
        <span className="text-[10px] uppercase tracking-wider text-muted">{label}</span>
      </div>
      <span className="sr-only">{`Fit score ${score} out of 100`}</span>
    </div>
  );
}
