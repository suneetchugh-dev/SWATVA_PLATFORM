package in.swatva.common.config;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Cross-origin policy for the browser client.
 *
 * Defaults to the local Vite dev server so a first run needs no configuration.
 * A deployment must set {@code CORS_ALLOWED_ORIGIN_PATTERNS} to the real origin,
 * otherwise the browser blocks every request and the app looks simply broken.
 *
 * <p>These are <em>patterns</em>, not literal origins, so a wildcard port
 * ({@code http://localhost:*}) is expressible. Spring's
 * {@code allowedOriginPatterns} is used rather than {@code allowedOrigins}
 * precisely because patterns work together with credentials.
 */
@Validated
@ConfigurationProperties(prefix = "app.cors")
public record CorsProperties(
        @NotEmpty(message = "CORS_ALLOWED_ORIGIN_PATTERNS must list at least one origin. "
                + "Set it to the deployed frontend origin, e.g. https://swatva.sahnirmaan.live")
        List<@NotNull String> allowedOriginPatterns,

        @NotEmpty(message = "app.cors.allowed-methods must list at least one HTTP method.")
        List<@NotNull String> allowedMethods,

        List<@NotNull String> allowedHeaders,

        boolean allowCredentials,

        long maxAgeSeconds) {

    public CorsProperties {
        // An origin never carries a trailing slash, but operators write one out of
        // habit. Left untrimmed it silently fails to match and every request 403s,
        // which looks like a backend outage rather than a config typo.
        allowedOriginPatterns = normalise(allowedOriginPatterns);
        allowedMethods = allowedMethods == null ? List.of() : List.copyOf(allowedMethods);
        allowedHeaders = allowedHeaders == null || allowedHeaders.isEmpty()
                ? List.of("*")
                : List.copyOf(allowedHeaders);
    }

    private static List<String> normalise(List<String> patterns) {
        if (patterns == null) {
            return List.of();
        }
        return patterns.stream()
                .filter(p -> p != null && !p.isBlank())
                .map(String::trim)
                // Keep "http://*" and "https://*" intact; only trim a real path.
                .map(p -> p.endsWith("/") && !p.endsWith("://") && !p.endsWith("/*")
                        ? p.substring(0, p.length() - 1)
                        : p)
                .toList();
    }

    /**
     * A bare {@code *} combined with credentials makes the server reflect any
     * origin back, which hands any site on the internet authenticated access to
     * this API. Refuse to start rather than let that ship by accident.
     */
    @AssertTrue(message = "app.cors.allowed-origin-patterns must not contain a bare '*' while "
            + "allow-credentials is true; name the deployed origins explicitly.")
    public boolean isCredentialsNotPairedWithWildcardOrigin() {
        if (!allowCredentials) {
            return true;
        }
        return allowedOriginPatterns.stream().noneMatch("*"::equals);
    }
}
