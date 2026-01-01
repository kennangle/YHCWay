export function between(prev: string | null, next: string | null): string {
  const CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const MID = Math.floor(CHARS.length / 2);

  if (!prev && !next) {
    return CHARS[MID];
  }

  if (!prev) {
    const firstChar = CHARS.indexOf(next![0]);
    if (firstChar <= 1) {
      return CHARS[0] + CHARS[MID];
    }
    return CHARS[Math.floor(firstChar / 2)];
  }

  if (!next) {
    const lastChar = CHARS.indexOf(prev[prev.length - 1]);
    if (lastChar >= CHARS.length - 2) {
      return prev + CHARS[MID];
    }
    const nextChar = Math.floor((lastChar + CHARS.length) / 2);
    return prev.slice(0, -1) + CHARS[nextChar];
  }

  for (let i = 0; i < Math.max(prev.length, next.length); i++) {
    const p = i < prev.length ? CHARS.indexOf(prev[i]) : -1;
    const n = i < next.length ? CHARS.indexOf(next[i]) : CHARS.length;

    if (n - p > 1) {
      const mid = Math.floor((p + n) / 2);
      return (i < prev.length ? prev.slice(0, i) : "") + CHARS[mid];
    }

    if (n - p === 1 || p === n) {
      continue;
    }
  }

  return prev + CHARS[MID];
}
