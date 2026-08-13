package fileidea.haggleai.voice;

import fileidea.haggleai.ai.SpokenSummaryService;
import fileidea.haggleai.run.JobSpec;
import fileidea.haggleai.run.Run;
import fileidea.haggleai.run.RunService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.UUID;

@RestController
@RequestMapping("/voice")
@RequiredArgsConstructor
public class VoiceWebhookController {

    private static final String XML = MediaType.APPLICATION_XML_VALUE;
    private static final int MAX_POLLS = 20;

    private final RunService runService;
    private final CallSessionRepository callSessionRepository;
    private final IntentParser intentParser;
    private final SpokenSummaryService spokenSummaryService;

    @Value("${haggle.public-base-url:http://localhost:8080}")
    private String publicBaseUrl;

    @PostMapping(value = "/incoming", produces = XML)
    public String incoming(@RequestParam("CallSid") String callSid,
                           @RequestParam(value = "From", required = false) String from) {
        callSessionRepository.save(new CallSession(callSid, from));
        String action = publicBaseUrl + "/voice/intent";
        return """
                <?xml version="1.0" encoding="UTF-8"?>
                <Response>
                  <Gather input="speech" timeout="4" speechTimeout="auto" action="%s" method="POST">
                    <Say voice="Polly.Joanna">Haggle A I here. What scan do you need, and where?</Say>
                  </Gather>
                  <Say voice="Polly.Joanna">I didn't catch that. Call back when you're ready.</Say>
                </Response>
                """.formatted(escape(action));
    }

    @PostMapping(value = "/intent", produces = XML)
    public String intent(@RequestParam("CallSid") String callSid,
                         @RequestParam(value = "SpeechResult", required = false) String speechResult,
                         @RequestParam(value = "From", required = false) String from) {
        CallSession session = callSessionRepository.findById(callSid)
                .orElseGet(() -> callSessionRepository.save(new CallSession(callSid, from)));

        if (speechResult == null || speechResult.isBlank()) {
            String action = publicBaseUrl + "/voice/intent";
            return """
                    <?xml version="1.0" encoding="UTF-8"?>
                    <Response>
                      <Gather input="speech" timeout="4" speechTimeout="auto" action="%s" method="POST">
                        <Say voice="Polly.Joanna">Sorry, I missed that. Try saying something like M R I of the lumbar spine near Toronto.</Say>
                      </Gather>
                      <Say voice="Polly.Joanna">Still nothing. Goodbye.</Say>
                    </Response>
                    """.formatted(escape(action));
        }

        JobSpec spec = intentParser.parse(speechResult);
        Run run = runService.start(spec, true);
        session.setRunId(run.getId());
        callSessionRepository.save(session);

        String checkUrl = publicBaseUrl + "/voice/check?runId=" + run.getId();
        return sayAndRedirect(
                "Got it. " + spec.describe() + ". Shopping clinics now. Stay on the line.",
                checkUrl,
                3
        );
    }

    @PostMapping(value = "/check", produces = XML)
    public String check(@RequestParam("CallSid") String callSid,
                        @RequestParam("runId") String runId) {
        UUID id = UUID.fromString(runId);
        CallSession session = callSessionRepository.findById(callSid).orElse(null);
        int polls = session != null ? session.incrementPollCount() : 1;
        if (session != null) {
            callSessionRepository.save(session);
        }

        if (runService.answerable(id) || polls >= MAX_POLLS) {
            if (session != null) {
                session.setEndedAt(Instant.now());
                callSessionRepository.save(session);
            }
            return say(spokenSummaryService.summarize(id));
        }

        String checkUrl = publicBaseUrl + "/voice/check?runId=" + runId;
        return sayAndRedirect(runService.statusFor(id), checkUrl, 3);
    }

    static String say(String line) {
        return """
                <?xml version="1.0" encoding="UTF-8"?>
                <Response>
                  <Say voice="Polly.Joanna">%s</Say>
                </Response>
                """.formatted(escape(line));
    }

    static String sayAndRedirect(String line, String next, int pauseSeconds) {
        return """
                <?xml version="1.0" encoding="UTF-8"?>
                <Response>
                  <Say voice="Polly.Joanna">%s</Say>
                  <Pause length="%d"/>
                  <Redirect method="POST">%s</Redirect>
                </Response>
                """.formatted(escape(line), pauseSeconds, escape(next));
    }

    private static String escape(String s) {
        return s == null ? "" : s.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}
