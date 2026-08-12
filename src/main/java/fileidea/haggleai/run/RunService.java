package fileidea.haggleai.run;

import fileidea.haggleai.negotiation.NegotiationOrchestrator;
import fileidea.haggleai.quote.Quote;
import fileidea.haggleai.quote.QuoteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.OptionalDouble;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RunService {
    private final RunRepository runRepository;
    private final QuoteRepository quoteRepository;
    private final NegotiationOrchestrator negotiationOrchestrator;

    @Value("${haggle.run.deadline-seconds:25}")
    private int deadlineSeconds;

    public Run start(JobSpec spec, boolean leverageEnabled) {
        UUID uuid = UUID.randomUUID();
        Instant deadline = Instant.now().plusSeconds(deadlineSeconds);
        Run run = new Run(uuid,spec,deadline);
        run.setLeverageEnabled(leverageEnabled);
        Run saved = runRepository.save(run);
        Thread.startVirtualThread(() -> negotiationOrchestrator.execute(saved.getId()));
        return saved;
    }

    public String statusFor(UUID runId) {
        Optional<Run> run = runRepository.findById(runId);
        if (run.isEmpty()) {
            return "I couldn't find that request.";
        }

        List<Quote> citable = quoteRepository.findByRunIdOrderByCapturedAtAsc(runId).stream()
                .filter(Quote::citable)
                .toList();
        long clinicsQuoted = citable.stream().map(Quote::getClinicName).distinct().count();
        OptionalDouble best = citable.stream().mapToDouble(Quote::total).min();
        String bestSoFar = best.isPresent()
                ? ", best so far is $" + (int) best.getAsDouble()
                : "";

        return switch (run.get().getState()) {
            case CREATED -> "Getting started.";
            case SHOPPING -> clinicsQuoted == 0
                    ? "Still calling clinics."
                    : clinicsQuoted + (clinicsQuoted == 1 ? " clinic has" : " clinics have")
                        + " quoted" + bestSoFar + ".";
            case NEGOTIATING -> "Negotiating now" + bestSoFar
                    + ". Pressing them with each other's prices.";
            case READY -> "All done.";
            case PARTIAL -> "Wrapping up with what I've got" + bestSoFar + ".";
            case FAILED -> "I'm having trouble reaching clinics right now.";
        };
    }

    public boolean answerable(UUID runId) {

      Optional<Run> run = runRepository.findById(runId);
      if (run.isEmpty()) {
          return false;
      }

      Run actual=  run.get();
      return actual.getState() == Run.RunState.READY || actual.getState() == Run.RunState.PARTIAL;
    }
}
