export function getPositiveIntegerEnv(name: string, fallback: number) {
  const rawValue = process.env[name];
  const parsed = rawValue ? Number.parseInt(rawValue, 10) : fallback;

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getMaxFetchBytes() {
  return getPositiveIntegerEnv("MAX_FETCH_BYTES", 1_000_000);
}

export function getFetchTimeoutMs() {
  return getPositiveIntegerEnv("FETCH_TIMEOUT_MS", 8_000);
}

export function getMaxUploadBytes() {
  return getPositiveIntegerEnv("MAX_UPLOAD_BYTES", 1_000_000);
}
