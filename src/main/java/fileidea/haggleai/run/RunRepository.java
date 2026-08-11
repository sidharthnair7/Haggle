package fileidea.haggleai.run;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface RunRepository extends JpaRepository<Run, UUID> {
}
