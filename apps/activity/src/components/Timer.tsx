import { useNow } from '../lib/useNow';

interface TimerProps {
  deadlineAt: number | null;
  serverOffset: number;
  totalSeconds: number;
  compact?: boolean;
}

function format(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

export function Timer({ deadlineAt, serverOffset, totalSeconds, compact = false }: TimerProps) {
  const now = useNow(250);
  const remaining =
    deadlineAt === null ? null : Math.max(0, Math.ceil((deadlineAt - (now + serverOffset)) / 1000));

  const display = remaining === null ? format(totalSeconds) : format(remaining);
  const urgent = remaining !== null && remaining <= 30;

  return (
    <span
      className={urgent ? 'timer timer--urgent' : 'timer'}
      aria-live={urgent ? 'assertive' : 'off'}
    >
      <span className="timer__value">{display}</span>
      {compact ? null : <span className="timer__unit">MM:SS</span>}
    </span>
  );
}
