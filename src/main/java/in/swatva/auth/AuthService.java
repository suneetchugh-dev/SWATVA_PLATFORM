package in.swatva.auth;

import in.swatva.user.model.User;
import in.swatva.user.repository.UserRepository;
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

    public String login(String email, String password) {
        User user = users.findByEmail(email.trim().toLowerCase(Locale.ROOT))
                .filter(User::isActive)
                .filter(candidate -> passwordEncoder.matches(password, candidate.getPasswordHash()))
                .orElseThrow(InvalidCredentialsException::new);
        return jwtService.createToken(user.getEmail());
    }
}
