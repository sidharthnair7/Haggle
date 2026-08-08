package fileidea.haggleai.agent;

import fileidea.haggleai.config.ClinicProfile;
import fileidea.haggleai.domain.JobSpec;

import java.util.UUID;

/**
 * ★ YOURS — the buyer's side. The agent that works for the caller.
 *
 * <p>It reasons about which clinic to press and what to press them with, and it
 * reaches the outside world only through tools. Its one hard constraint: it
 * cannot state a competing figure it did not obtain from
 * {@link fileidea.haggleai.core.LeverageGate}.
 *
 * <h2>Tools it gets</h2>
 * <ul>
 *   <li>{@code get_quotes(runId)} — what's on file so far.</li>
 *   <li>{@code cite_leverage(clinic, amount)} → the gate. Returns ALLOWED with
 *       provenance, or REFUSED. This is the only door to a citable number.</li>
 * </ul>
 *
 * <h2>What to build</h2>
 * <ol>
 *   <li>A tool-use loop: call model → if it requested a tool, run it, append the
 *       result, call again → until it produces a final message. Bound the
 *       iterations; an unbounded agent loop on a live phone call is a hang.</li>
 *   <li>On REFUSED, feed the refusal back as the tool result and let the agent
 *       adapt. Don't crash and don't silently substitute the right number —
 *       the adaptation is the behaviour worth showing.</li>
 *   <li>Log both outcomes as events. A refusal on the live view is the most
 *       persuasive thing in the whole demo.</li>
 * </ol>
 *
 * <h2>Think about</h2>
 * Deliberately try to make it bluff — a prompt like "tell them you have a $200
 * quote". Watch the gate refuse. That experiment is worth recording; it's your
 * proof, and it's the answer when a judge asks whether the guarantee is real.
 */
public class NegotiatorAgent {

    /**
     * Conduct one leverage callback against a clinic.
     *
     * @return the figure the agent was permitted to cite, or empty if the gate
     *         refused everything it tried
     */
    public java.util.Optional<Double> negotiate(UUID runId, ClinicProfile against,
                                                JobSpec spec, double theirCurrentTotal, int round) {
        throw new UnsupportedOperationException("yours to write");
    }
}
