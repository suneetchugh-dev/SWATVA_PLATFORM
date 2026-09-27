package in.swatva.transparency.model.enums;

public enum ReportCategory {
    BRIBE_DEMAND("Demanding bribe or facilitation money"),
    UNAUTHORIZED_FEE("Charging unauthorized fee for free government service"),
    DOCUMENT_HOARDING("Refusing to accept or withholding valid citizen documents"),
    APPLICATION_DELAY("Undue harassment or intentional application delay"),
    MIDDLEMAN_EXPLOITATION("Unauthorized agent or middleman interference"),
    SERVICE_DENIAL("Denying service without valid official rejection reason"),
    OTHER("Other irregularity or procedural grievance");

    private final String displayName;

    ReportCategory(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
