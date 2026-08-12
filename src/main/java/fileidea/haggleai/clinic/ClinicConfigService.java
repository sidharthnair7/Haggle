package fileidea.haggleai.clinic;

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
