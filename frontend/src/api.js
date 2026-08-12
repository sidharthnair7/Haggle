const API_BASE = import.meta.env.VITE_API_BASE || '';

async function json(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
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
