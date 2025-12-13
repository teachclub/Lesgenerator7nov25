type AnyObj = Record<string, any>;

const KEY = "lesgo_v2_ctx";

export function loadLessonCtx<T = AnyObj>(): T | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function saveLessonCtx(ctx: AnyObj) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(ctx || {}));
  } catch {}
}

export function mergeLessonCtx(patch: AnyObj) {
  const cur = loadLessonCtx<AnyObj>() || {};
  const next = { ...cur, ...(patch || {}) };
  saveLessonCtx(next);
  return next;
}

export function clearLessonCtx() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
}

