const DUCK_LINES = [
  "hi :)",
  "fair split, fair pond",
  "tap me again",
  "quack",
  "who owes snacks?",
  "scroll for balances",
  "this water is chill",
  "feed us?",
  "settle up later",
  "nice dashboard",
];

const FISH_LINES = [
  "splash!",
  "fish friend here",
  "did someone drop food?",
  "glub glub",
];

export function randomDuckLine(exclude?: string): string {
  const pool = exclude ? DUCK_LINES.filter((l) => l !== exclude) : DUCK_LINES;
  return pool[Math.floor(Math.random() * pool.length)] ?? DUCK_LINES[0];
}

export function randomFishLine(): string {
  return FISH_LINES[Math.floor(Math.random() * FISH_LINES.length)];
}
