package fileidea.haggleai.quote;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface QuoteRepository extends JpaRepository<Quote, UUID> {

    List<Quote> findByRunIdOrderByCapturedAtAsc(UUID runId);

    List<Quote> findByRunIdAndClinicNameOrderByCapturedAtDesc(UUID runId, String clinicName);

    List<Quote> findByRunIdAndClinicNameNot(UUID runId, String clinicName);
}
