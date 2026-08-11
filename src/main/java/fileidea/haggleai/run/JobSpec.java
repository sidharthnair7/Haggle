package fileidea.haggleai.run;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

/**
 * What the caller actually wants, structured. Both intake paths — speech from
 * the phone and the web form — produce this same shape, which is what lets one
 * orchestrator serve two channels.
 */
@Embeddable
public class JobSpec {

    @Column(name = "procedure_name")
    private String procedureName;

    @Column(name = "body_part")
    private String bodyPart;

    private boolean contrast;

    private String location;

    private int radiusKm = 50;

    protected JobSpec() {
    }

    public JobSpec(String procedureName, String bodyPart, boolean contrast, String location, int radiusKm) {
        this.procedureName = procedureName;
        this.bodyPart = bodyPart;
        this.contrast = contrast;
        this.location = location;
        this.radiusKm = radiusKm;
    }

    /** One line for prompts and for the phone's confirmation sentence. */
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

    public String getProcedureName() {
        return procedureName;
    }

    public String getBodyPart() {
        return bodyPart;
    }

    public boolean isContrast() {
        return contrast;
    }

    public String getLocation() {
        return location;
    }

    public int getRadiusKm() {
        return radiusKm;
    }
}
