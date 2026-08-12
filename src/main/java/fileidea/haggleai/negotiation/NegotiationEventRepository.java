package fileidea.haggleai.negotiation;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface NegotiationEventRepository extends JpaRepository<NegotiationEvent, Long> {

    List<NegotiationEvent> findByRunIdOrderByAtAsc(UUID runId);

    /**
     * SSE cursor. Ordered by id, not timestamp — the cursor IS the id, so ordering
     * by anything else can skip events. Under parallel agents several events land
     * in the same millisecond and an event with an earlier timestamp can be
     * assigned a later id; ordering by {@code at} would then stream it out of
     * order or drop it past the cursor entirely.
     */
    List<NegotiationEvent> findByRunIdAndIdGreaterThanOrderByIdAsc(UUID runId, Long afterId);
}
