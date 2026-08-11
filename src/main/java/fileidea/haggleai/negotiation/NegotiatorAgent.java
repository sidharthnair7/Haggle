package fileidea.haggleai.negotiation;

import fileidea.haggleai.clinic.ClinicProfile;
import fileidea.haggleai.quote.LeverageGate;
import fileidea.haggleai.quote.Quote;
import fileidea.haggleai.quote.QuoteRepository;
import fileidea.haggleai.run.JobSpec;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * The buyer's side. Its one hard constraint: it cannot state a competing
 * figure it did not obtain through {@link LeverageGate}. Even in this
 * deterministic version, every candidate number goes through the gate —
 * the invariant is enforced by the code path, not by trust.
 */
@Service
@RequiredArgsConstructor
public class NegotiatorAgent {

    private final QuoteRepository quoteRepository;
    private final LeverageGate leverageGate;
    private final NegotiationEventRepository negotiationEventRepository;

    /**
     * Conduct one leverage callback against a clinic.
     *
     * @return the figure the agent was permitted to cite, or empty if the gate
     *         refused everything it tried
     */
    public Optional<Double> negotiate(UUID runId, ClinicProfile against,
                                      JobSpec spec, double theirCurrentTotal, int round) {
        // Best (lowest) competing totals on file, tried in order.
        List<Double> candidates = quoteRepository.findByRunIdAndClinicNameNot(runId, against.name())
                .stream()
                .filter(Quote::citable)
                .map(Quote::total)
                .distinct()
                .sorted()
                .toList();

        for (double candidate : candidates) {
            if (candidate >= theirCurrentTotal) {
                break; // sorted ascending: nothing left that undercuts them
            }
            LeverageGate.Result result = leverageGate.verify(runId, against.name(), candidate);
            negotiationEventRepository.save(new NegotiationEvent(
                    runId,
                    result.allowed() ? NegotiationEvent.Type.LEVERAGE_ALLOWED
                                     : NegotiationEvent.Type.LEVERAGE_REFUSED,
                    against.name(),
                    round,
                    result.reason(),
                    candidate
            ));
            if (result.allowed()) {
                return Optional.of(candidate);
            }
        }
        return Optional.empty();
    }
}
