package fileidea.haggleai.core;

import fileidea.haggleai.domain.Run;

import java.util.UUID;

/**
 * ★ YOURS — the heart of the system. Roughly 100 lines of control flow.
 *
 * <p>Bulk Synchronous Parallel: a parallel compute phase, then a barrier, then
 * the next round may use the previous round's results. Repeat until nothing
 * changes.
 *
 * <h2>The shape</h2>
 * <pre>
 * Round 1  — every clinic agent quotes, in parallel. Barrier.
 * Round 2+ — for each clinic, is there a better competing quote on file?
 *            If yes, negotiator calls back citing it. All in parallel. Barrier.
 *            If no price moved this round, stop.
 * </pre>
 *
 * <h2>Why the barrier matters</h2>
 * Without it, clinic B could cite C as leverage while C is still citing B, and
 * "X moved because of Y" stops being a well-formed sentence. Attribution — the
 * entire provenance story — depends on rounds resolving completely before the
 * next one reads them. The barrier isn't a performance detail, it's the thing
 * that makes the claim true.
 *
 * <h2>What to build</h2>
 * <ol>
 *   <li>Virtual threads for the parallel phase:
 *       {@code Executors.newVirtualThreadPerTaskExecutor()}. Submit one task per
 *       clinic, then join them all — the join <i>is</i> the barrier.</li>
 *   <li>Persist every quote as a new row. Never update a price in place; the
 *       history is the evidence.</li>
 *   <li>Emit a {@link fileidea.haggleai.domain.NegotiationEvent} at each step so
 *       the web view and the phone narration have something to read.</li>
 *   <li>Termination: {@code if (!anyMoved) break;} — iteration to a fixed point,
 *       the same shape as constraint propagation or Bellman-Ford relaxation.</li>
 *   <li>Check {@link Run#expired()} at every barrier. Past the deadline, stop
 *       and mark PARTIAL — whatever exists is the answer.</li>
 * </ol>
 *
 * <h2>Think about</h2>
 * What happens when one clinic agent throws while four succeed? A run that dies
 * because one LLM call 500'd is a run that dies on stage. The barrier should
 * tolerate partial failure.
 */
public class NegotiationOrchestrator {

    /**
     * Runs the full negotiation to completion or deadline. Called on a
     * background thread — the phone webhook must never wait on this.
     */
    public void execute(UUID runId) {
        throw new UnsupportedOperationException("yours to write");
    }
}
