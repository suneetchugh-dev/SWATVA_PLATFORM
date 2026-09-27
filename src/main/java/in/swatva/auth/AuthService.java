package in.swatva.auth;

import in.swatva.user.model.User;
import in.swatva.user.repository.UserRepository;
import java.time.Instant;
import java.util.Locale;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository users, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public User register(String fullName, String email, String password) {
        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        if (users.findByEmail(normalizedEmail).isPresent()) {
            throw new DuplicateEmailException();
        }
        User user = new User();
        user.setFullName(fullName.trim());
        user.setEmail(normalizedEmail);
        user.setPasswordHash(passwordEncoder.encode(password));
        return users.save(user);
    }

    @Transactional
    public User syncFirebaseUser(String fullName, String email) {
        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        return users.findByEmail(normalizedEmail).orElseGet(() -> {
            User user = new User();
            String name = (fullName != null && !fullName.isBlank()) ? fullName.trim() : normalizedEmail.split("@")[0];
            user.setFullName(name);
            user.setEmail(normalizedEmail);
            user.setPasswordHash(passwordEncoder.encode(java.util.UUID.randomUUID().toString()));
            return users.save(user);
        });
    }

    private static final java.util.Map<String, OtpRecord> otpStore = new java.util.concurrent.ConcurrentHashMap<>();

    public record OtpRecord(String otp, java.time.Instant expiresAt, java.time.Instant lastSentAt) {}
    public record OtpResponse(String email, String message, int coolDownSeconds, String debugOtp) {}

    public OtpResponse sendOtp(String email) {
        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        Instant now = Instant.now();
        OtpRecord existing = otpStore.get(normalizedEmail);
        if (existing != null && now.isBefore(existing.lastSentAt().plusSeconds(30))) {
            long remaining = 30 - (now.getEpochSecond() - existing.lastSentAt().getEpochSecond());
            return new OtpResponse(normalizedEmail, "Please wait " + remaining + " seconds before requesting a new OTP.", (int) remaining, existing.otp());
        }

        String otp = String.format("%06d", new java.util.Random().nextInt(1000000));
        otpStore.put(normalizedEmail, new OtpRecord(otp, now.plusSeconds(300), now));
        System.out.println("[AUTH OTP SERVICE] Sent OTP " + otp + " to email: " + normalizedEmail);

        return new OtpResponse(normalizedEmail, "OTP sent successfully to " + normalizedEmail, 30, otp);
    }

    public OtpResponse resendOtp(String email) {
        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        otpStore.remove(normalizedEmail);
        return sendOtp(normalizedEmail);
    }

    @Transactional
    public User verifyOtpUser(String email, String otp) {
        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        OtpRecord record = otpStore.get(normalizedEmail);
        if (record == null || Instant.now().isAfter(record.expiresAt())) {
            throw new InvalidCredentialsException();
        }
        if (!record.otp().equals(otp.trim())) {
            throw new InvalidCredentialsException();
        }
        otpStore.remove(normalizedEmail);

        return users.findByEmail(normalizedEmail).orElseGet(() -> {
            User user = new User();
            user.setFullName(normalizedEmail.split("@")[0]);
            user.setEmail(normalizedEmail);
            user.setPasswordHash(passwordEncoder.encode(java.util.UUID.randomUUID().toString()));
            return users.save(user);
        });
    }

    public String login(String email, String password) {
        User user = users.findByEmail(email.trim().toLowerCase(Locale.ROOT))
                .filter(User::isActive)
                .filter(candidate -> passwordEncoder.matches(password, candidate.getPasswordHash()))
                .orElseThrow(InvalidCredentialsException::new);
        return jwtService.createToken(user.getEmail());
    }
}

