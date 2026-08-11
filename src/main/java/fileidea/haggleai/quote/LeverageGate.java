package fileidea.haggleai.quote;

import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;


@Service
@AllArgsConstructor
public class LeverageGate {

    private final QuoteRepository quoteRepository;

    public record Result(boolean allowed, String reason, Quote provenance) {

    }

    public Result verify(UUID runId, String againstClinic, double claimedTotal) {
        //1) get all quotes on this run NOT from againstClinic
        //2) Keep only the citable ones(Quote already has a citable()method.
        //3) is there one whose total() is within a cent of claimedTotal?
        //4) yes-> result(true,",,," that quote
        List<Quote> quotes = quoteRepository.findByRunIdAndClinicNameNot(runId, againstClinic);

        List<Quote>citableQuotes=quotes.stream()
                                .filter(Quote::citable)
                                .toList();

        for(Quote quote:citableQuotes){
            if(Math.abs(quote.total() - claimedTotal)<0.01){
                return new Result(true, "Allowed: matches quote from " + quote.getClinicName(),quote);
            }

        }
        return new Result(false,"Refused: no citable quote matches " + claimedTotal,null);

    }
}
