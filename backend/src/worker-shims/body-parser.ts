/** Stub for Workers bundle — Express requires body-parser at import time. */
function noopParser() {
  return (_req: unknown, _res: unknown, next: () => void) => {
    next();
  };
}

export function json() {
  return noopParser();
}

export function raw() {
  return noopParser();
}

export function text() {
  return noopParser();
}

export function urlencoded() {
  return noopParser();
}

export default { json, raw, text, urlencoded };
