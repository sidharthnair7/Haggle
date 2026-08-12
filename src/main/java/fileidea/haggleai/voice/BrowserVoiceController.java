package fileidea.haggleai.voice;

import fileidea.haggleai.ai.SpokenSummaryService;
import fileidea.haggleai.run.JobSpec;
import fileidea.haggleai.run.Run;
import fileidea.haggleai.run.RunService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/voice")
@RequiredArgsConstructor
public class BrowserVoiceController {

    private final IntentParser intentParser;
    private final RunService runService;
    private final SpokenSummaryService spokenSummaryService;

    public record Utterance(String text) {
    }

    @PostMapping("/intent")
    public Map<String, Object> intent(@RequestBody Utterance body) {
        JobSpec spec = intentParser.parse(body.text());
        Run run = runService.start(spec, true);
        return Map.of(
                "runId", run.getId().toString(),
                "heard", spec.describe(),
                "reply", "Got it. " + spec.describe() + ". Shopping clinics now."
        );
    }

    @GetMapping("/status/{runId}")
    public Map<String, Object> status(@PathVariable UUID runId) {
        boolean done = runService.answerable(runId);
        String spoken = done ? spokenSummaryService.summarize(runId) : runService.statusFor(runId);
        return Map.of(
                "runId", runId.toString(),
                "answerable", done,
                "spoken", spoken,
                "status", runService.statusFor(runId),
                "summaryProvider", spokenSummaryService.providerLabel()
        );
    }
}
