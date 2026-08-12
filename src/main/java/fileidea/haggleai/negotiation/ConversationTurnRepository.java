package fileidea.haggleai.negotiation;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ConversationTurnRepository extends JpaRepository<ConversationTurn, Long> {

    /** Ordered by id: turns are written concurrently, and id is the only stable sequence. */
    List<ConversationTurn> findByRunIdOrderByIdAsc(UUID runId);
}
