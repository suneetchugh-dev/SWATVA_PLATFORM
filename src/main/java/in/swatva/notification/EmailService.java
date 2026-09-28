package in.swatva.notification;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class EmailService {
    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final ResendProperties resendProperties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public EmailService(ResendProperties resendProperties, ObjectMapper objectMapper) {
        this.resendProperties = resendProperties;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    public boolean isLiveEmailEnabled() {
        return resendProperties.isConfigured();
    }

    /**
     * Sends an OTP verification email to the user.
     * If RESEND_API_KEY is not configured, logs the OTP to stdout/logs as dev fallback.
     */
    public boolean sendOtpEmail(String recipientEmail, String otp) {
        if (!resendProperties.isConfigured()) {
            log.info("[OTP DEV SIMULATION] No RESEND_API_KEY provided. Verification OTP for {} is: {}", recipientEmail, otp);
            System.out.println("══════════════════════════════════════════════════════════════");
            System.out.println(" [DEV OTP FALLBACK] Recipient: " + recipientEmail);
            System.out.println(" [DEV OTP CODE]     OTP:       " + otp);
            System.out.println(" (Set RESEND_API_KEY in .env to send real transactional emails)");
            System.out.println("══════════════════════════════════════════════════════════════");
            return true;
        }

        try {
            String subject = "Your Swatva AI Verification Code: " + otp;
            String htmlContent = buildOtpEmailHtml(otp);
            String textContent = "Your Swatva AI verification OTP is: " + otp + ". This code expires in 5 minutes. Do not share it with anyone.";

            Map<String, Object> payload = Map.of(
                    "from", resendProperties.getFromEmail(),
                    "to", List.of(recipientEmail),
                    "subject", subject,
                    "html", htmlContent,
                    "text", textContent
            );

            String requestBody = objectMapper.writeValueAsString(payload);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(resendProperties.getApiUrl()))
                    .timeout(Duration.ofSeconds(15))
                    .header("Authorization", "Bearer " + resendProperties.getApiKey())
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                log.info("Real OTP email delivered via Resend to {} [status={}]", recipientEmail, response.statusCode());
                return true;
            } else {
                log.error("Resend API rejected email to {}. Status: {}, Response: {}", recipientEmail, response.statusCode(), response.body());
                return false;
            }
        } catch (Exception e) {
            log.error("Failed to send OTP email to {} via Resend: {}", recipientEmail, e.getMessage(), e);
            return false;
        }
    }

    private String buildOtpEmailHtml(String otp) {
        return """
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Swatva AI Verification Code</title>
              <style>
                body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; }
                .container { max-width: 560px; margin: 30px auto; background-color: #1e293b; border-radius: 16px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.4); }
                .header { background: linear-gradient(135deg, #047857 0%, #0f766e 100%); padding: 32px 24px; text-align: center; }
                .header h1 { margin: 0; font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: 0.5px; }
                .header p { margin: 6px 0 0 0; font-size: 13px; color: #a7f3d0; font-weight: 500; }
                .content { padding: 36px 32px; text-align: center; }
                .message { font-size: 15px; line-height: 1.6; color: #cbd5e1; margin-bottom: 28px; }
                .otp-box { background: #0f172a; border: 2px dashed #10b981; border-radius: 12px; padding: 18px 24px; display: inline-block; margin: 10px auto 28px auto; }
                .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #34d399; margin: 0; }
                .expiry { font-size: 13px; color: #94a3b8; margin-top: 8px; }
                .footer { background-color: #0f172a; padding: 20px 24px; text-align: center; border-top: 1px solid #334155; font-size: 12px; color: #64748b; }
                .footer a { color: #10b981; text-decoration: none; }
                .security-note { font-size: 12px; color: #e2e8f0; background: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444; padding: 10px 14px; text-align: left; border-radius: 4px; margin-top: 24px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Swatva AI</h1>
                  <p>Societal Welfare & Benefit Discovery Platform</p>
                </div>
                <div class="content">
                  <p class="message">Hello,<br>Use the following verification code to authenticate your email address and continue.</p>
                  <div class="otp-box">
                    <div class="otp-code">%s</div>
                  </div>
                  <div class="expiry">⏱ Valid for <strong>5 minutes</strong></div>
                  <div class="security-note">
                    🔒 <strong>Security Tip:</strong> Never share this code with anyone. Swatva AI administrators will never ask for your verification code.
                  </div>
                </div>
                <div class="footer">
                  <p>© 2026 Swatva AI • <a href="https://swatva.sahnirmaan.live" target="_blank">swatva.sahnirmaan.live</a></p>
                  <p>If you did not request this OTP, you can safely ignore this email.</p>
                </div>
              </div>
            </body>
            </html>
            """.formatted(otp);
    }
}
