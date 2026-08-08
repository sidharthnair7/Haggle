package fileidea.haggleai.telephony;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Twilio inbound voice webhook — the plumbing only.
 *
 * <p>Twilio POSTs form-encoded parameters here and expects TwiML (XML) back.
 * There is no SDK involved: {@code CallSid}/{@code From}/{@code SpeechResult}
 * bind natively as request params, and TwiML is a string with an XML content
 * type. That is the whole integration surface for inbound calls.
 *
 * <p><b>The constraint that shapes everything downstream:</b> Twilio enforces a
 * hard 15-second timeout on voice webhook responses, and that budget includes
 * TCP connect and TLS handshake. Every method here must return fast. Long work
 * belongs in a background run that the call polls via {@code <Redirect>}.
 */
@RestController
@RequestMapping("/voice")
public class VoiceWebhookController {

    private static final String XML = MediaType.APPLICATION_XML_VALUE;

    /**
     * Entry point: Twilio hits this the moment the call connects.
     *
     * <p>Day-1 target is exactly this — pick up and say one sentence. Once that
     * works end to end over a real PSTN call, replace the body with a
     * {@code <Gather input="speech">} that posts the caller's intent to
     * {@link #intent}.
     */
    @PostMapping(value = "/incoming", produces = XML)
    public String incoming(@RequestParam("CallSid") String callSid,
                           @RequestParam(value = "From", required = false) String from) {
        return say("Haggle A I here. Connected.");
    }

    /**
     * Speech intent lands here after a {@code <Gather>}.
     *
     * <p>TODO (yours): parse {@code speechResult} into a JobSpec, start the run,
     * store the CallSid to runId mapping, then hand off to the hold loop.
     */
    @PostMapping(value = "/intent", produces = XML)
    public String intent(@RequestParam("CallSid") String callSid,
                         @RequestParam(value = "SpeechResult", required = false) String speechResult) {
        throw new UnsupportedOperationException("intent capture not built yet");
    }

    /**
     * The hold loop: Twilio re-enters here every few seconds while the run works.
     *
     * <p>TODO (yours). This is the load-bearing piece and it is deliberately not
     * written for you — it is where the 15-second constraint gets solved. Shape:
     * read run state, and either narrate real progress and redirect back here,
     * or speak the final result. Never block waiting for the run to finish.
     */
    @PostMapping(value = "/check", produces = XML)
    public String check(@RequestParam("CallSid") String callSid,
                        @RequestParam("runId") String runId) {
        throw new UnsupportedOperationException("hold loop not built yet");
    }

    // ---- TwiML helpers ----

    /** Speak a line, then hang up. */
    static String say(String line) {
        return """
                <?xml version="1.0" encoding="UTF-8"?>
                <Response>
                  <Say voice="Polly.Joanna">%s</Say>
                </Response>
                """.formatted(escape(line));
    }

    /** Speak a line, pause, then re-enter {@code next} — the hold-loop primitive. */
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

    /** TwiML is XML: an unescaped ampersand in a clinic name breaks the whole response. */
    private static String escape(String s) {
        return s == null ? "" : s.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}
