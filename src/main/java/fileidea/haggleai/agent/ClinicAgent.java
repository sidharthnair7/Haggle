package fileidea.haggleai.agent;

import fileidea.haggleai.config.ClinicProfile;
import fileidea.haggleai.domain.JobSpec;
import fileidea.haggleai.domain.Quote;

import java.util.UUID;

/**
 * ★ YOURS — the change that makes this a multi-agent system instead of a
 * simulation with AI paint on it.
 *
 * <p>Each clinic is a real LLM conversation with its own isolated context. Its
 * {@link ClinicProfile#floor()} lives in its system prompt and nowhere the
 * negotiator can reach. The negotiator has to actually extract the price.
 *
 * <h2>The two-context rule</h2>
 * This agent's messages are never appended to the negotiator's conversation and
 * vice versa. The orchestrator relays only what each side "says out loud". The
 * moment both sides share a context, the negotiation becomes theatre and the
 * whole originality claim evaporates.
 *
 * <h2>The guardrail — and why it isn't cheating</h2>
 * An LLM told "never go below $395" will eventually go below $395. So the floor
 * is enforced <b>in code</b>: {@code submit_quote} rejects an under-floor
 * submission and makes the agent try again.
 *
 * <p>The LLM still decides <i>whether</i> to concede, <i>how much</i> within the
 * legal range, and <i>what to say</i>. Code only enforces the bound. That's a
 * guardrail, not a script — and it's the same philosophy as the leverage gate:
 * structure over prompt.
 *
 * <h2>What to build</h2>
 * <ol>
 *   <li>System prompt from the profile: persona, opening total, fee structure,
 *       hidden floor, and whether they itemize without being asked.</li>
 *   <li>One tool — {@code submit_quote(lineItems[])}. The agent cannot end its
 *       turn any other way, which is what guarantees you get structured output
 *       instead of prose you have to regex.</li>
 *   <li>Validate on submission: below floor → return a tool error and let it
 *       retry. Cap the retries.</li>
 *   <li>STONEWALLER never submits — it returns {@link Quote.Outcome#DECLINED}.
 *       Make sure the orchestrator handles a clinic that never quotes.</li>
 * </ol>
 *
 * <h2>Think about</h2>
 * How does the agent know what round it's in, and should it? A clinic that
 * remembers being pushed twice behaves differently from one that doesn't.
 */
public class ClinicAgent {

    /** Round 1: opening quote, no pressure applied yet. */
    public Quote openingQuote(UUID runId, ClinicProfile profile, JobSpec spec) {
        throw new UnsupportedOperationException("yours to write");
    }

    /** When a bundled headline needs breaking down before it's comparable. */
    public Quote pressForItemization(UUID runId, ClinicProfile profile, JobSpec spec) {
        throw new UnsupportedOperationException("yours to write");
    }

    /**
     * Round 2+: the negotiator has cited a verified competing total. Concede,
     * or hold — but never below {@link ClinicProfile#floor()}.
     */
    public Quote respondToLeverage(UUID runId, ClinicProfile profile, JobSpec spec,
                                   double currentTotal, double citedCompetingTotal, int round) {
        throw new UnsupportedOperationException("yours to write");
    }
}
