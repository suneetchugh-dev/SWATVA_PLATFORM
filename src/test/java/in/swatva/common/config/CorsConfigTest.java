package in.swatva.common.config;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.DefaultCorsProcessor;

class CorsConfigTest {

    private static final String ALLOW_ORIGIN = "Access-Control-Allow-Origin";
    private static final String ALLOW_CREDENTIALS = "Access-Control-Allow-Credentials";

    private static ValidatorFactory factory;
    private static Validator validator;

    @BeforeAll
    static void setUpValidator() {
        factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @AfterAll
    static void closeValidator() {
        factory.close();
    }

    private static CorsProperties properties(List<String> origins) {
        return new CorsProperties(origins, List.of("GET", "POST"), List.of("*"), true, 3600);
    }

    @Test
    void acceptsAnExplicitOriginList() {
        assertThat(validator.validate(properties(List.of("https://swatva.sahnirmaan.live"))))
                .isEmpty();
    }

    @Test
    void defaultsToTheLocalDevServer() {
        assertThat(validator.validate(properties(List.of("http://localhost:*", "http://127.0.0.1:*"))))
                .isEmpty();
    }

    @Test
    void rejectsAnEmptyOriginList() {
        assertThat(validator.validate(properties(List.of())))
                .anyMatch(v -> v.getPropertyPath().toString().contains("allowedOriginPatterns"));
    }

    /**
     * A bare "*" with credentials makes the server reflect any origin, which
     * hands every site on the internet authenticated access. Startup must fail.
     */
    @Test
    void rejectsAWildcardOriginWhileCredentialsAreAllowed() {
        assertThat(validator.validate(properties(List.of("*"))))
                .anyMatch(v -> v.getMessage().contains("allow-credentials"));
    }

    @Test
    void allowsAWildcardOriginWhenCredentialsAreDisabled() {
        CorsProperties open = new CorsProperties(List.of("*"), List.of("GET"), List.of("*"), false, 60);
        assertThat(validator.validate(open)).isEmpty();
    }

    @Test
    void trimsWhitespaceAndDropsBlankEntries() {
        CorsProperties cleaned = properties(List.of("  https://a.example  ", "", "   "));
        assertThat(cleaned.allowedOriginPatterns()).containsExactly("https://a.example");
    }

    /**
     * A trailing slash is the classic silent failure: the origin never matches,
     * so every request is refused and it reads as a backend outage.
     */
    @Test
    void stripsATrailingSlashButKeepsWildcardPortsIntact() {
        assertThat(properties(List.of("https://a.example/")).allowedOriginPatterns())
                .containsExactly("https://a.example");
        assertThat(properties(List.of("http://localhost:5173")).allowedOriginPatterns())
                .containsExactly("http://localhost:5173");
    }

    @Test
    void defaultsAllowedHeadersToWildcardWhenUnset() {
        CorsProperties noHeaders = new CorsProperties(
                List.of("https://a.example"), List.of("GET"), null, true, 60);
        assertThat(noHeaders.allowedHeaders()).isEqualTo(List.of("*"));
    }

    // ------------------------------------------------------------------
    // The handshake itself, exercised through the real Spring processor so
    // the assertions cannot drift from what the container actually returns.
    // ------------------------------------------------------------------

    private static MockHttpServletResponse preFlight(CorsConfigurationSource source, String origin)
            throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("OPTIONS", "/api/schemes");
        request.addHeader("Origin", origin);
        request.addHeader("Access-Control-Request-Method", "GET");
        MockHttpServletResponse response = new MockHttpServletResponse();
        CorsConfiguration configuration = source.getCorsConfiguration(request);
        new DefaultCorsProcessor().processRequest(configuration, request, response);
        return response;
    }

    @Test
    void allowsAConfiguredProductionOrigin() throws Exception {
        MockHttpServletResponse response = preFlight(
                new CorsConfig().corsConfigurationSource(
                        properties(List.of("https://swatva.sahnirmaan.live"))),
                "https://swatva.sahnirmaan.live");

        assertThat(response.getHeader(ALLOW_ORIGIN))
                .isEqualTo("https://swatva.sahnirmaan.live");
        assertThat(response.getHeader(ALLOW_CREDENTIALS)).isEqualTo("true");
    }

    @Test
    void refusesAnOriginThatWasNotConfigured() throws Exception {
        MockHttpServletResponse response = preFlight(
                new CorsConfig().corsConfigurationSource(
                        properties(List.of("https://swatva.sahnirmaan.live"))),
                "https://evil.example");

        assertThat(response.getHeader(ALLOW_ORIGIN)).isNull();
        assertThat(response.getHeader(ALLOW_CREDENTIALS)).isNull();
    }

    @Test
    void allowsTheDevServerOnAnyPort() throws Exception {
        MockHttpServletResponse response = preFlight(
                new CorsConfig().corsConfigurationSource(properties(List.of("http://localhost:*"))),
                "http://localhost:5173");

        assertThat(response.getHeader(ALLOW_ORIGIN))
                .isEqualTo("http://localhost:5173");
    }

    @Test
    void doesNotLeakTheAllowedMethodsToADisallowedOrigin() {
        CorsConfigurationSource source = new CorsConfig().corsConfigurationSource(
                properties(List.of("https://swatva.sahnirmaan.live")));

        CorsConfiguration configuration = source.getCorsConfiguration(
                new MockHttpServletRequest("OPTIONS", "/api/schemes"));
        assertThat(configuration).isNotNull();
        assertThat(configuration.getAllowedMethods()).containsExactly("GET", "POST");
        assertThat(configuration.getAllowCredentials()).isTrue();
        assertThat(Set.copyOf(configuration.getAllowedOriginPatterns()))
                .containsExactly("https://swatva.sahnirmaan.live");
    }
}
