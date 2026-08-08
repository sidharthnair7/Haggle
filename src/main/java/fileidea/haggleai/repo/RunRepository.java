package fileidea.haggleai.repo;

import fileidea.haggleai.domain.Run;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface RunRepository extends JpaRepository<Run, UUID> {
}
