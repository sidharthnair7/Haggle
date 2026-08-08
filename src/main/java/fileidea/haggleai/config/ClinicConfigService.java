package fileidea.haggleai.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Optional;

/**
 * Loads the counterparty config pack once at boot.
 *
 * <p>"Config, not code" is a real claim here: nothing in the agents, the gate or
 * the orchestrator names a clinic or a price. Point this at a different YAML and
 * the same engine negotiates a different market.
 */
@Service
public class ClinicConfigService {

    private record Pack(List<ClinicProfile> clinics) {
    }

    private final ObjectMapper yaml = new ObjectMapper(new YAMLFactory())
            .findAndRegisterModules();

    @Value("${haggle.run.clinic-count:5}")
    private int clinicCount;

    private List<ClinicProfile> clinics = List.of();

    @PostConstruct
    void load() throws IOException {
        try (InputStream in = new ClassPathResource("clinics.yaml").getInputStream()) {
            Pack pack = yaml.readValue(in, Pack.class);
            this.clinics = pack.clinics() == null ? List.of() : List.copyOf(pack.clinics());
        }
    }

    /**
     * The clinics for one run, capped at the configured count.
     *
     * <p>Demo runs at 5 for legibility; set {@code CLINIC_COUNT=10} to prove it
     * scales. Note the structural ceiling: leverage only ever cites the single
     * best competing quote, so clinics beyond the first few widen the spread
     * without adding much negotiating power.
     */
    public List<ClinicProfile> forRun() {
        return clinics.stream().limit(Math.max(1, clinicCount)).toList();
    }

    public Optional<ClinicProfile> byName(String name) {
        return clinics.stream().filter(c -> c.name().equals(name)).findFirst();
    }

    public List<ClinicProfile> all() {
        return clinics;
    }
}
