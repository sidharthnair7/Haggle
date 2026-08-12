package fileidea.haggleai.negotiation;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ConversationTurnRepository extends JpaRepository<ConversationTurn, Long> {

    List<ConversationTurn> findByRunIdOrderByIdAsc(UUID runId);
}
