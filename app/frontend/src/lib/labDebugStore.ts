type DebugEvent = {
  id: string;
  at: number;
  endpoint: string;
  ok: boolean;
  ms: number;
  error?: string;
};

let events: DebugEvent[] = [];
const listeners = new Set<() => void>();

export function logEvent(e: DebugEvent) {
  events.unshift(e);
  events.splice(10);
  listeners.forEach((l) => l());
}

export function getEvents() {
  return events;
}

export function resetEvents() {
  events = [];
  listeners.forEach((l) => l());
}

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

