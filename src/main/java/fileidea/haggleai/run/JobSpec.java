package fileidea.haggleai.run;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Embeddable
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class JobSpec {

    @Column(name = "procedure_name")
    private String procedureName;

    @Column(name = "body_part")
    private String bodyPart;

    private boolean contrast;

    private String location;

    private int radiusKm = 50;

    public JobSpec(String procedureName, String bodyPart, boolean contrast, String location, int radiusKm) {
        this.procedureName = procedureName;
        this.bodyPart = bodyPart;
        this.contrast = contrast;
        this.location = location;
        this.radiusKm = radiusKm;
    }

    public String describe() {
        StringBuilder sb = new StringBuilder(procedureName);
        if (bodyPart != null && !bodyPart.isBlank()) {
            sb.append(' ').append(bodyPart);
        }
        sb.append(contrast ? " with contrast" : " without contrast");
        if (location != null && !location.isBlank()) {
            sb.append(" near ").append(location);
        }
        return sb.toString();
    }
}
