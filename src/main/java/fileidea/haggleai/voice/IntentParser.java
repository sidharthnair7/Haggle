package fileidea.haggleai.voice;

import fileidea.haggleai.run.JobSpec;
import org.springframework.stereotype.Component;

/**
 * Cheap speech → JobSpec parser for the demo. Looks for procedure / body part /
 * contrast / location keywords. Swap for an LLM later without changing callers.
 */
@Component
public class IntentParser {

    public JobSpec parse(String speech) {
        String text = speech == null ? "" : speech.toLowerCase();

        String procedure = "MRI";
        if (text.contains("ct scan") || text.contains(" ct ") || text.startsWith("ct ")) {
            procedure = "CT";
        } else if (text.contains("ultrasound") || text.contains("sonogram")) {
            procedure = "Ultrasound";
        } else if (text.contains("x-ray") || text.contains("xray") || text.contains("x ray")) {
            procedure = "X-ray";
        } else if (text.contains("mri") || text.contains("magnetic")) {
            procedure = "MRI";
        }

        String bodyPart = null;
        if (text.contains("lumbar") || text.contains("lower back") || text.contains("spine")) {
            bodyPart = "lumbar spine";
        } else if (text.contains("knee")) {
            bodyPart = "knee";
        } else if (text.contains("shoulder")) {
            bodyPart = "shoulder";
        } else if (text.contains("brain") || text.contains("head")) {
            bodyPart = "brain";
        } else if (text.contains("abdomen") || text.contains("abdominal")) {
            bodyPart = "abdomen";
        }

        boolean contrast = text.contains("with contrast")
                || (text.contains("contrast") && !text.contains("without contrast")
                && !text.contains("no contrast"));

        String location = "Peterborough";
        if (text.contains("toronto")) {
            location = "Toronto";
        } else if (text.contains("ottawa")) {
            location = "Ottawa";
        } else if (text.contains("kawartha")) {
            location = "Kawartha Lakes";
        } else if (text.contains("peterborough")) {
            location = "Peterborough";
        }

        return new JobSpec(procedure, bodyPart, contrast, location, 50);
    }
}
