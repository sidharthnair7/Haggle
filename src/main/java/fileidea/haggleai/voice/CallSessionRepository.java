package fileidea.haggleai.voice;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CallSessionRepository extends JpaRepository<CallSession, String> {
}
