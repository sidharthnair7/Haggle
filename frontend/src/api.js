const API_BASE = import.meta.env.VITE_API_BASE || '';

// fetch() has no default timeout, so a backend that accepts the connection and
// then never answers (restarting, redeploying, cold) leaves the promise pending
// forever. The catch never runs, so the workspace sat on "DIALLING…"
// indefinitely instead of saying it couldn't reach the service. Creating a run
// returns immediately server-side — the negotiation itself runs async — so
// anything past this is a dead backend, not a slow one.
const DEFAULT_TIMEOUT_MS = 15000;

async function json(path, { timeoutMs = DEFAULT_TIMEOUT_MS, ...options } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      signal: controller.signal,
    });
  } catch (e) {
    if (e.name === 'AbortError') {
      throw new Error(
        `The negotiation service didn't respond within ${Math.round(timeoutMs / 1000)}s. `
        + 'It may still be starting up — give it a moment and try again.'
      );
    }
    throw new Error('Could not reach the negotiation service.');
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed (${res.status})`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export function startRun(body) {
  return json('/api/runs', { method: 'POST', body: JSON.stringify(body) });
}

export function getRun(id) {
  return json(`/api/runs/${id}`);
}

/** Honesty demo: try to cite a fake price through the leverage gate (should REFUSE). */
export function tryBluff(runId, body = { claimedTotal: 200 }) {
  return json(`/api/runs/${runId}/bluff`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function subscribeRunEvents(runId, { onEvent, onDone, onError }) {
  const es = new EventSource(`${API_BASE}/api/runs/${runId}/events`);
  es.addEventListener('negotiation', (e) => {
    try {
      onEvent?.(JSON.parse(e.data));
    } catch (err) {
      onError?.(err);
    }
  });
  es.addEventListener('done', (e) => {
    onDone?.(e.data);
    es.close();
  });
  es.onerror = (err) => {
    onError?.(err);
  };
  return () => es.close();
}
