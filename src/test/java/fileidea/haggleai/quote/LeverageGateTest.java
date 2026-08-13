package fileidea.haggleai.quote;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

/**
 * The honesty guarantee is the product's central claim, so it gets the tests.
 *
 * <p>Each case here is a way the agent could end up stating a price nobody
 * quoted. If any of them start passing when they should refuse, the claim
 * "the agent cannot bluff" stops being true.
 */
@ExtendWith(MockitoExtension.class)
class LeverageGateTest {

    private static final String AGAINST = "Yorkville Radiology";
    private static final String RIVAL = "Danforth Medical Imaging";

    @Mock
    private QuoteRepository quoteRepository;

    private LeverageGate gate;
    private UUID runId;

    @BeforeEach
    void setUp() {
        gate = new LeverageGate(quoteRepository);
        runId = UUID.randomUUID();
    }

    private Quote itemized(String clinic, double... amounts) {
        List<LineItem> items = java.util.Arrays.stream(amounts)
                .mapToObj(a -> new LineItem("line", a))
                .toList();
        return new Quote(runId, clinic, 1, Quote.Outcome.ITEMIZED, items);
    }

    private void storeHolds(Quote... quotes) {
        when(quoteRepository.findByRunIdAndClinicNameNot(eq(runId), any()))
                .thenReturn(List.of(quotes));
    }

    @Test
    @DisplayName("allows a figure that matches a real itemized quote, and returns its provenance")
    void allowsVerifiedFigure() {
        Quote rival = itemized(RIVAL, 375, 85); // $460
        storeHolds(rival);

        LeverageGate.Result result = gate.verify(runId, AGAINST, 460);

        assertThat(result.allowed()).isTrue();
        assertThat(result.provenance()).isSameAs(rival);
        assertThat(result.reason()).contains(RIVAL);
    }

    @Test
    @DisplayName("refuses a fabricated figure and carries no provenance")
    void refusesFabricatedFigure() {
        storeHolds(itemized(RIVAL, 375, 85)); // only $460 exists

        LeverageGate.Result result = gate.verify(runId, AGAINST, 200);

        assertThat(result.allowed()).isFalse();
        assertThat(result.provenance()).isNull();
        assertThat(result.reason()).contains("200");
    }

    @Test
    @DisplayName("refuses when the run has no quotes at all")
    void refusesWhenStoreIsEmpty() {
        storeHolds();

        assertThat(gate.verify(runId, AGAINST, 460).allowed()).isFalse();
    }

    @Test
    @DisplayName("refuses a bundled quote's total — a headline with no breakdown is not comparable")
    void refusesBundledQuote() {
        Quote bundled = new Quote(runId, RIVAL, 1, Quote.Outcome.BUNDLED,
                List.of(new LineItem("all-in", 380)));
        storeHolds(bundled);

        LeverageGate.Result result = gate.verify(runId, AGAINST, 380);

        assertThat(result.allowed())
                .as("a bundled $380 hides fees, so it cannot be used as leverage")
                .isFalse();
    }

    @Test
    @DisplayName("refuses a declined quote, which has no figure to cite")
    void refusesDeclinedQuote() {
        Quote declined = new Quote(runId, RIVAL, 1, Quote.Outcome.DECLINED, List.of());
        storeHolds(declined);

        assertThat(gate.verify(runId, AGAINST, 0).allowed()).isFalse();
    }

    @Test
    @DisplayName("a clinic's own quote is never leverage against itself")
    void excludesTheClinicBeingNegotiatedWith() {
        // The repository query filters the clinic out; the gate must rely on that
        // rather than on the agent choosing politely.
        when(quoteRepository.findByRunIdAndClinicNameNot(runId, AGAINST))
                .thenReturn(List.of());

        LeverageGate.Result result = gate.verify(runId, AGAINST, 620);

        assertThat(result.allowed()).isFalse();
    }

    @Test
    @DisplayName("matches within a cent, but refuses anything outside it")
    void matchesOnlyWithinACent() {
        storeHolds(itemized(RIVAL, 460.00));

        assertThat(gate.verify(runId, AGAINST, 460.005).allowed())
                .as("rounding noise should still match")
                .isTrue();
        assertThat(gate.verify(runId, AGAINST, 461).allowed())
                .as("a dollar off is a different number")
                .isFalse();
    }

    @Test
    @DisplayName("picks the matching quote when several clinics are on file")
    void findsTheRightQuoteAmongMany() {
        Quote cheap = itemized(RIVAL, 460);
        Quote mid = itemized("Bloor West Imaging", 495);
        storeHolds(cheap, mid);

        assertThat(gate.verify(runId, AGAINST, 495).provenance()).isSameAs(mid);
        assertThat(gate.verify(runId, AGAINST, 460).provenance()).isSameAs(cheap);
    }
}
