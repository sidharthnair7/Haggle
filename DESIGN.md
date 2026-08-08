# HaggleAI — design decisions

Multi-agent price negotiation you reach by **phone**. Call a number, say what you
need, hold while a negotiator agent shops competing counterparties against each
other, and hear back a verified winner. The web app shows the full proof.

This file records every architectural fork and why it was taken. It exists
because "why did you build it this way" is a better question than "what does it
do", and the answers should be written down while they're fresh.

---

## The constraint everything bends around

> A phone call is a hard real-time channel with a **15-second webhook budget**,
> and the negotiation work takes 30+ seconds.

Twilio enforces a hard 15s timeout on voice webhook responses, and that budget
includes TCP connect and TLS handshake. Every other decision below is downstream
of that mismatch.

---

## 1. How the caller waits

| Option | Rejected because |
|---|---|
| Callback — hang up, dial back when ready | Architecturally easiest, and it destroys the product. The whole moment is the caller holding while the system visibly works. |
| Media Streams — bidirectional WebSocket, raw μ-law audio | The right answer at production scale. Owning STT, TTS, VAD and turn detection is 2–3 days by itself. |
| **Hold loop — `<Redirect>` polling** | ✅ **Chosen.** Each webhook returns in under a second; the call stays open. |

**The upgrade:** don't play hold music. Each poll **narrates real run state** —
*"Still working, two clinics have quoted, best so far is $340."* Same store the
web UI reads. The polling architecture stops being a workaround and becomes the
feature that makes the system sound alive.

Media Streams is named in the writeup as known next-step. Knowing why you didn't
do something scores better than pretending it wasn't an option.

## 2. Voice in / voice out

| Layer | Chosen | Why |
|---|---|---|
| STT | Twilio `<Gather input="speech">` | Twilio handles endpointing and hands over text in the webhook body. Whisper adds a round trip to a budget that's already tight. |
| TTS | Twilio `<Say>` (Polly) | ElevenLabs sounds better and adds cost plus a mid-call failure mode. Keep it for web transcript playback only. |

General principle: **on the real-time path, prefer the provider's built-in.**
Every hop you own is a hop that can hang.

## 3. Agent architecture

The question that matters: *how is the clinic's price floor genuinely hidden
from the negotiator?*

| Option | Rejected because |
|---|---|
| One LLM roleplaying both sides | It knows both hands. The negotiation is theatre. |
| Floor in code, LLM writes dialogue | The LLM is a paint layer over arithmetic. |
| **Two isolated LLM contexts** | ✅ **Chosen.** |

The floor lives in the clinic agent's system prompt and in nothing the
negotiator can read. The orchestrator relays only what each side says out loud.
The concession is genuinely emergent — provable by running the same setup with
leverage disabled and showing prices don't move.

**Guardrail:** an LLM counterparty is non-deterministic and might cave instantly
or stonewall forever. The floor is enforced **in code on the `submit_quote`
tool** — a submission below floor is rejected and the agent retries. The LLM
decides *whether* and *how much* to concede; code enforces the bounds.
Emergent behaviour, demo-safe range. Structure over prompt.

## 4. The leverage gate

| Option | Rejected because |
|---|---|
| Prompt: "never invent numbers" | Unenforceable. Everyone does this. |
| Post-hoc validation | You caught it *after* the agent said it. |
| **Tool boundary** | ✅ **Chosen.** |

The negotiator cannot *obtain* a competing figure except by calling
`cite_leverage(counterparty, amount)`, which checks the quote store and returns
`ALLOWED` with provenance or `REFUSED`. Refusal comes back as a tool result the
agent has to adapt to. Bluffing isn't discouraged, it's unreachable.

## 5. Round structure

**Chosen: discrete rounds with a barrier.** Round 1 — all agents quote in
parallel. Round 2+ — leverage callbacks in parallel, only where leverage exists.
Loop until no price moves, then stop.

This is **Bulk Synchronous Parallel**: compute phase, communication phase,
barrier, repeat. The barrier is not a performance detail — it's what makes
attribution possible. Without it, B could cite C as leverage while C is still
citing B, and "X moved because of Y" stops being a well-formed sentence. The
provenance story depends on the barrier.

The termination condition (`if (!anyMoved) break;`) is **iteration to a fixed
point** — the same shape as constraint propagation and Bellman-Ford relaxation.

## 6. Concurrency

**Chosen: virtual threads.** The workload is N concurrent LLM HTTP calls — pure
blocking IO, exactly what they're for. WebFlux would give identical throughput
with far worse debuggability at 2am on day 4.

## 7. Web live updates

**Chosen: SSE.** Server-to-client one-way is precisely the problem shape. Plain
HTTP GET, native browser auto-reconnect, trivial in Spring. WebSocket buys
bidirectionality that isn't needed. The same event stream feeds the web view and
the phone's status narration.

## 8. Persistence

**Chosen: Postgres over a document store.** The data is relational — run →
quotes → transcripts → events → report — and the central query is *"best fully
itemized quote for run X excluding counterparty Y"*. One line of SQL; a
hand-rolled aggregation in Mongo.

## 9. Model choice per role

Not one model — **one per role, driven by the latency budget.**

| Role | Model class | Why |
|---|---|---|
| Clinic agents | Fast / cheap | Many in parallel, short turns. Their latency *is* the hold time. |
| Negotiator | Strongest affordable | Reasoning plus tool use. There's one of it. |
| Intent extraction | Small, structured output | One shot, on the critical path. |

**watsonx is not on the agent path.** The Lite plan is 300k tokens/month and
**2 requests/second** — ten parallel agents would serialize into ~5s of pure
queueing and blow the token cap during rehearsals. watsonx writes the spoken
result only: one call per run, ~200 tokens, template fallback if it's down.

## 10. Failure behaviour

**Partial results beat error messages.** The layering:

1. **Deadline enforced in code.** At T seconds, whatever exists *is* the answer.
2. **Degrade to partial** — speak the best verified quote so far, name what's
   still running.
3. **Hard failure only when there is literally nothing** — and then say the real
   reason, not a fabricated one.

"Traffic is too high" when the truth is a slow model call would violate the
product's own thesis inside the demo.

## 11. Infrastructure

- **Build:** ngrok with a **static domain** — without it the URL rotates every
  restart and Twilio needs reconfiguring each time.
- **Demo:** warm deployed host, ngrok as backup. Not a free tier that cold-starts
  long enough to kill a live call.
- **No Twilio SDK.** Inbound voice is a form-encoded POST Spring binds natively;
  TwiML is a returned XML string. The SDK only earns its place for outbound calls
  or signature validation, neither of which is in the demo path.

## 12. Scale

5 clinic agents in the demo, `N` configurable, one recorded run at 10.

Structural reason 10 buys less than it looks: **the leverage mechanism only ever
cites the single best competing quote.** Agents 6–10 widen the price spread but
add almost no negotiating power. Diminishing returns by design, not by accident.

---

## Deliberately not built

Bill PDF parsing · auth and user accounts · real outbound PSTN to clinics ·
mid-call freeform chat · CallerID identity matching · SMS summaries.

Each was cut for the same reason: it doesn't appear in the 90 seconds that
matter, and every one of them is a way to arrive on day 7 with a broken spine.
