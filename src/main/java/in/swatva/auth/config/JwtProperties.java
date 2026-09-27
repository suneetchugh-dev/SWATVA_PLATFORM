package in.swatva.auth.config;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "app.security.jwt")
public record JwtProperties(
        @NotBlank(message = "JWT secret is not set. Add JWT_SECRET to your .env file (32+ bytes).")
        @Size(min = 32, message = "JWT secret must be at least 32 bytes to sign HS256 tokens.")
        String secret,
        long expirationMinutes) { }
