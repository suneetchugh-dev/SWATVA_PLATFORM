package in.swatva.readiness.model.enums;

public enum ReadinessTrafficLight {
    RED,
    YELLOW,
    GREEN;

    public static ReadinessTrafficLight fromScore(int score) {
        if (score <= 40) {
            return RED;
        } else if (score <= 80) {
            return YELLOW;
        } else {
            return GREEN;
        }
    }
}
