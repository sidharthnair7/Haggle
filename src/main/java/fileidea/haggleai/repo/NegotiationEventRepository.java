package fileidea.haggleai.repo;

import fileidea.haggleai.domain.NegotiationEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface NegotiationEventRepository extends JpaRepository<NegotiationEvent, Long> {

    List<NegotiationEvent> findByRunIdOrderByAtAsc(UUID runId);

    List<NegotiationEvent> findByRunIdAndIdGreaterThanOrderByAtAsc(UUID runId, Long afterId);
}
