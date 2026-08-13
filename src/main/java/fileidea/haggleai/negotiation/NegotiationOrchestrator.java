package fileidea.haggleai.negotiation;

import fileidea.haggleai.clinic.ClinicAgent;
import fileidea.haggleai.clinic.ClinicConfigService;
import fileidea.haggleai.clinic.ClinicProfile;
import fileidea.haggleai.quote.Quote;
import fileidea.haggleai.quote.QuoteRepository;
import fileidea.haggleai.run.Run;
import fileidea.haggleai.run.RunRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Consumer;

/**
 * Bulk Synchronous Parallel negotiation.
 *
 * <p>Each round is a parallel compute phase followed by a barrier: every clinic
 * is worked concurrently on a virtual thread, and nothing in round N+1 may read
 * a result until round N has fully resolved. {@code invokeAll} <em>is</em> the
 * barrier — it returns only when every task has finished.
 *
 * <p>The barrier is not a performance detail. Without it, clinic B could cite C
 * as leverage while C is still citing B, and "this price moved because of that
 * quote" would stop being a well-formed statement. Attribution — and therefore
 * the whole provenance claim — depends on rounds resolving completely.
 *
 * <p>Rounds 2+ cite gate-verified leverage until no price moves (iteration to a
 * fixed point) or the deadline expires.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class NegotiationOrchestrator {

    private final RunRepository runRepository;
    private final QuoteRepository quoteRepository;
    private final NegotiationEventRepository negotiationEventRepository;
    private final ClinicConfigService clinicConfigService;
    private final ClinicAgent clinicAgent;
    private final NegotiatorAgent negotiatorAgent;
    private final ConversationTurnRepository conversations;

    private void sayAgent(UUID runId, String clinic, int round, String text) {
        if (text == null || text.isBlank()) {
            return;
        }
        conversations.save(new ConversationTurn(
                runId, clinic, round, ConversationTurn.Speaker.AGENT, text, null));
    }

    /**
     * What the agent says back once a clinic has given (or refused) a number.
     *
     * <p>Null for a bundled quote: the itemization press is the very next line,
     * and two agent turns in a row with no reply between them doesn't read as a
     * conversation.
     */
    private static String closingRound1(Quote quote) {
        return switch (quote.getOutcome()) {
            case DECLINED -> "No worries — thanks for your time.";
            case BUNDLED -> null;
            case ITEMIZED -> "$" + (int) quote.total() + " — got it, thanks. I'm checking a "
                    + "few other places.";
        };
    }

    /** And what it says after a clinic either moves or holds on a callback. */
    private static String closingCallback(boolean moved, double newTotal) {
        return moved
                ? "$" + (int) newTotal + " — appreciate you looking. I'll come back to you "
                    + "once I've heard from the rest."
                : "Understood. If anything opens up on your end, I'd still rather book with you.";
    }

    private static String article(String phrase) {
        if (phrase == null || phrase.isBlank()) {
            return "a";
        }
        char c = Character.toUpperCase(phrase.charAt(0));
        return "AEFHILMNORSX".indexOf(c) >= 0 ? "an" : "a";
    }

    @Value("${haggle.run.max-rounds:3}")
    private int maxRounds;

    public void execute(UUID runId) {
        Optional<Run> runOpt = runRepository.findById(runId);
        if (runOpt.isEmpty()) {
            return;
        }
        Run run = runOpt.get();

        try {
            shopRound1(run);
            if (run.expired()) {
                finishPartialOrFailed(run);
                return;
            }

            itemizeBundled(run);
            if (run.expired()) {
                finishPartialOrFailed(run);
                return;
            }

            if (!run.isLeverageEnabled()) {
                finishReadyOrFailed(run);
                return;
            }

            negotiateRounds(run);
            finishReadyOrFailed(run);
        } catch (Exception e) {
            run.setState(hasCitable(runId) ? Run.RunState.PARTIAL : Run.RunState.FAILED);
            run.setCompletedAt(Instant.now());
            runRepository.save(run);
            emit(runId, NegotiationEvent.Type.RUN_COMPLETE, null, run.getRound(),
                    "Run ended with error: " + e.getMessage(), null);
        }
    }

    private void shopRound1(Run run) {
        UUID runId = run.getId();
        run.setState(Run.RunState.SHOPPING);
        run.setRound(1);
        runRepository.save(run);
        emit(runId, NegotiationEvent.Type.RUN_STARTED, null, 1, "Shopping started", null);

        runInParallel(clinicConfigService.forRun(), clinic -> {
            if (run.expired()) {
                return;
            }
            emit(runId, NegotiationEvent.Type.CLINIC_DIALED, clinic.name(), 1,
                    "Calling " + clinic.name(), null);
            sayAgent(runId, clinic.name(), 1,
                    "Hi, this is the Haggle agent calling for a patient — she's paying "
                            + "cash, so I'm just trying to get a price on "
                            + article(run.getSpec().describe()) + " "
                            + run.getSpec().describe() + ". What're you charging for that?");
            Quote quote = clinicAgent.openingQuote(runId, clinic, run.getSpec());
            quoteRepository.save(quote);
            emit(runId, NegotiationEvent.Type.QUOTE_RECEIVED, clinic.name(), 1,
                    quote.getOutcome().name(),
                    quote.citable() || quote.getOutcome() == Quote.Outcome.BUNDLED
                            ? quote.total() : null);

            // A real call doesn't end the second a number is said — you repeat it
            // back, check nothing's hiding behind it, and tell them what happens
            // next. Without this every exchange reads as one question and one
            // answer, which is not how anyone actually talks on the phone.
            sayAgent(runId, clinic.name(), 1, closingRound1(quote));
        });

        emit(runId, NegotiationEvent.Type.ROUND_COMPLETE, null, 1, "Round 1 complete", null);
    }

    /**
     * Runs one task per clinic on virtual threads and waits for all of them.
     *
     * <p>The wait is the barrier. A clinic that throws is logged and skipped — one
     * failed model call must not take down a round, because a run that dies
     * because a single provider 500'd is a run that dies on stage.
     */
    private void runInParallel(List<ClinicProfile> clinics, Consumer<ClinicProfile> work) {
        List<Callable<Void>> tasks = clinics.stream()
                .map(clinic -> (Callable<Void>) () -> {
                    try {
                        work.accept(clinic);
                    } catch (Exception e) {
                        log.warn("Clinic task failed for {}: {}", clinic.name(), e.getMessage());
                    }
                    return null;
                })
                .toList();

        try (ExecutorService pool = Executors.newVirtualThreadPerTaskExecutor()) {
            pool.invokeAll(tasks); // returns only when every task has finished — the barrier
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private void itemizeBundled(Run run) {
        UUID runId = run.getId();
        Map<String, Quote> latestByClinic = latestQuotes(runId);

        for (Map.Entry<String, Quote> entry : latestByClinic.entrySet()) {
            if (run.expired()) {
                break;
            }
            Quote latest = entry.getValue();
            if (latest.getOutcome() != Quote.Outcome.BUNDLED) {
                continue;
            }
            Optional<ClinicProfile> profile = clinicConfigService.byName(entry.getKey());
            if (profile.isEmpty()) {
                continue;
            }
            emit(runId, NegotiationEvent.Type.PRESSED_FOR_ITEMIZATION, entry.getKey(), 1,
                    "Pressed for itemization", latest.total());
            sayAgent(runId, entry.getKey(), 1,
                    "Before we go further — can you break that down for me? "
                            + "Is there a facility fee or a read fee on top of that?");
            Quote itemized = clinicAgent.pressForItemization(runId, profile.get(), run.getSpec());
            quoteRepository.save(itemized);
            emit(runId, NegotiationEvent.Type.QUOTE_RECEIVED, entry.getKey(), 1,
                    itemized.getOutcome().name(),
                    itemized.citable() ? itemized.total() : null);
            sayAgent(runId, entry.getKey(), 1, closingRound1(itemized));
        }
    }

    private void negotiateRounds(Run run) {
        UUID runId = run.getId();
        for (int round = 2; round <= maxRounds; round++) {
            if (run.expired()) {
                break;
            }
            run.setState(Run.RunState.NEGOTIATING);
            run.setRound(round);
            runRepository.save(run);

            // about the same market state — that is what the barrier buys us, and it's
            Map<String, Quote> latestByClinic = latestQuotes(runId);
            AtomicBoolean anyMoved = new AtomicBoolean(false);
            int currentRound = round;

            runInParallel(clinicConfigService.forRun(), clinic -> {
                if (run.expired()) {
                    return;
                }
                Quote theirs = latestByClinic.get(clinic.name());
                if (theirs == null || !theirs.citable()) {
                    return;
                }
                double theirTotal = theirs.total();
                Optional<Double> cited = negotiatorAgent.negotiate(
                        runId, clinic, run.getSpec(), theirTotal, currentRound);
                if (cited.isEmpty()) {
                    return;
                }

                Quote response = clinicAgent.respondToLeverage(
                        runId, clinic, run.getSpec(), theirTotal, cited.get(), currentRound);
                quoteRepository.save(response);

                boolean moved = response.citable() && response.total() < theirTotal - 0.01;
                emit(runId,
                        moved ? NegotiationEvent.Type.PRICE_MOVED : NegotiationEvent.Type.PRICE_HELD,
                        clinic.name(),
                        currentRound,
                        moved
                                ? "Moved from $" + (int) theirTotal + " to $" + (int) response.total()
                                : "Held at $" + (int) theirTotal,
                        response.citable() ? response.total() : theirTotal);

                sayAgent(runId, clinic.name(), currentRound,
                        closingCallback(moved, response.citable() ? response.total() : theirTotal));

                if (moved) {
                    anyMoved.set(true);
                }
            });

            emit(runId, NegotiationEvent.Type.ROUND_COMPLETE, null, round,
                    "Round " + round + " complete", null);
            if (!anyMoved.get()) {
                break;
            }
        }
    }

    private Map<String, Quote> latestQuotes(UUID runId) {
        Map<String, Quote> latest = new HashMap<>();
        List<Quote> all = quoteRepository.findByRunIdOrderByCapturedAtAsc(runId).stream()
                .sorted(Comparator.comparingInt(Quote::getRound)
                        .thenComparing(Quote::getCapturedAt))
                .toList();
        for (Quote q : all) {
            latest.put(q.getClinicName(), q); // later overwrites earlier
        }
        return latest;
    }

    private void finishReadyOrFailed(Run run) {
        if (run.expired()) {
            finishPartialOrFailed(run);
            return;
        }
        boolean ok = hasCitable(run.getId());
        run.setState(ok ? Run.RunState.READY : Run.RunState.FAILED);
        run.setCompletedAt(Instant.now());
        runRepository.save(run);
        emit(run.getId(), NegotiationEvent.Type.RUN_COMPLETE, null, run.getRound(),
                ok ? "Run complete" : "Run failed — no citable quotes", null);
    }

    private void finishPartialOrFailed(Run run) {
        emit(run.getId(), NegotiationEvent.Type.DEADLINE_HIT, null, run.getRound(),
                "Deadline hit", null);
        boolean ok = hasCitable(run.getId());
        run.setState(ok ? Run.RunState.PARTIAL : Run.RunState.FAILED);
        run.setCompletedAt(Instant.now());
        runRepository.save(run);
        emit(run.getId(), NegotiationEvent.Type.RUN_COMPLETE, null, run.getRound(),
                ok ? "Partial result — deadline expired" : "Run failed — no citable quotes", null);
    }

    private boolean hasCitable(UUID runId) {
        return quoteRepository.findByRunIdOrderByCapturedAtAsc(runId).stream()
                .anyMatch(Quote::citable);
    }

    private void emit(UUID runId, NegotiationEvent.Type type, String clinic,
                      int round, String detail, Double amount) {
        negotiationEventRepository.save(
                new NegotiationEvent(runId, type, clinic, round, detail, amount));
    }
}
