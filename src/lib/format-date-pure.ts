function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Locale-independent date string: DD/MM HH:MM. Pure function, no client/server dependencies. */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
