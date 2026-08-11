package fileidea.haggleai.quote;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

/**
 * The provenance store. Everything the leverage gate is allowed to believe
 * lives here — if a figure isn't in this table, the negotiator cannot use it.
 *
 * <p>Deliberately kept to plain derived queries. Ordering by a quote's total
 * means summing an element collection, which is awkward and fragile in JPQL;
 * the totalling and "which is best" decision belong in the gate anyway, where
 * you can read them.
 */
public interface QuoteRepository extends JpaRepository<Quote, UUID> {

    List<Quote> findByRunIdOrderByCapturedAtAsc(UUID runId);

    List<Quote> findByRunIdAndClinicNameOrderByCapturedAtDesc(UUID runId, String clinicName);

    /**
     * Every quote on this run that did not come from the given clinic.
     *
     * <p>Filter to {@link Quote#citable()} and take the minimum total to get
     * the leverage figure — that's the gate's job, not the database's.
     */
    List<Quote> findByRunIdAndClinicNameNot(UUID runId, String clinicName);
}
