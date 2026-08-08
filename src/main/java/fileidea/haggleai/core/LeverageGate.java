package fileidea.haggleai.core;

import fileidea.haggleai.domain.Quote;

import java.util.UUID;

/**
 * ★ YOURS — this is the originality claim. Roughly 40 lines.
 *
 * <p>The negotiator agent cannot state a competing price unless it first calls
 * {@code cite_leverage}, which lands here. This class is the only path from
 * "a number the LLM would like to say" to "a number the LLM is allowed to say".
 *
 * <p>Why a tool boundary and not a prompt instruction: a prompt saying "never
 * invent figures" is a request. A tool that returns REFUSED is a wall. The
 * agent doesn't decline to bluff — it cannot obtain the material to bluff with.
 *
 * <h2>What to build</h2>
 * <ol>
 *   <li>Load every quote on this run except the one from {@code againstClinic}
 *       ({@code QuoteRepository.findByRunIdAndClinicNameNot}).</li>
 *   <li>Keep only {@link Quote#citable()} ones — itemized and comparable.</li>
 *   <li>Find one whose total matches {@code claimedTotal} within a cent.</li>
 *   <li>Match → ALLOWED, carrying the source quote so the UI can show where the
 *       number came from. No match → REFUSED with a reason a human can read.</li>
 * </ol>
 *
 * <h2>The demo this enables</h2>
 * Call it with a real figure, watch ALLOWED. Call it with a number you invented,
 * watch REFUSED. Same code path the agent uses. That's the 20 seconds of the
 * video that no other team will have.
 *
 * <h2>Think about</h2>
 * Should an ALLOWED result be recorded as a {@code LEVERAGE_ALLOWED} event? A
 * refusal is arguably the more interesting thing to show on the live view.
 */
public class LeverageGate {

    /**
     * @param allowed    whether the agent may state this figure
     * @param reason     human-readable, shown on the live view and in the report
     * @param provenance the quote the figure came from, null when refused
     */
    public record Result(boolean allowed, String reason, Quote provenance) {
    }

    /**
     * @param runId         the run whose provenance store is authoritative
     * @param againstClinic who the agent is negotiating with — their own quote
     *                      can never be leverage against themselves
     * @param claimedTotal  the figure the agent wants to cite
     */
    public Result verify(UUID runId, String againstClinic, double claimedTotal) {
        throw new UnsupportedOperationException("yours to write");
    }
}
