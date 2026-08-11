package fileidea.haggleai.quote;

import jakarta.persistence.Embeddable;

/**
 * One line of a quote. Itemization is the whole game: a clinic quoting "$450
 * all in" and one quoting "$310 scan + $140 radiology read" are not comparable
 * until the first one breaks it down.
 */
@Embeddable
public class LineItem {

    private String label;
    private double amount;

    protected LineItem() {
    }

    public LineItem(String label, double amount) {
        this.label = label;
        this.amount = amount;
    }

    public String getLabel() {
        return label;
    }

    public double getAmount() {
        return amount;
    }
}
