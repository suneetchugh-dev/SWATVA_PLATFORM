package in.swatva.auth.api;

import in.swatva.auth.AuthService;
import in.swatva.auth.JwtService;
import in.swatva.common.api.ApiResponse;
import in.swatva.user.model.User;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;
    private final JwtService jwtService;

    public AuthController(AuthService authService, JwtService jwtService) {
        this.authService = authService;
        this.jwtService = jwtService;
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest request) {
        User user = authService.register(request.fullName(), request.email(), request.password());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(AuthResponse.from(user, jwtService.createToken(user.getEmail()))));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        String token = authService.login(request.email(), request.password());
        return ResponseEntity.ok(ApiResponse.success(new AuthResponse(token, "Bearer", null, request.email().trim())));
    }

    @PostMapping("/firebase")
    public ResponseEntity<ApiResponse<AuthResponse>> firebaseLogin(@Valid @RequestBody FirebaseLoginRequest request) {
        User user = authService.syncFirebaseUser(request.fullName(), request.email());
        String token = jwtService.createToken(user.getEmail());
        return ResponseEntity.ok(ApiResponse.success(new AuthResponse(token, "Bearer", user.getId(), user.getEmail())));
    }

    @PostMapping("/send-otp")
    public ResponseEntity<ApiResponse<AuthService.OtpResponse>> sendOtp(@Valid @RequestBody SendOtpRequest request) {
        AuthService.OtpResponse response = authService.sendOtp(request.email());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/resend-otp")
    public ResponseEntity<ApiResponse<AuthService.OtpResponse>> resendOtp(@Valid @RequestBody SendOtpRequest request) {
        AuthService.OtpResponse response = authService.resendOtp(request.email());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<ApiResponse<AuthResponse>> verifyOtp(@Valid @RequestBody VerifyOtpRequest request) {
        User user = authService.verifyOtpUser(request.email(), request.otp());
        String token = jwtService.createToken(user.getEmail());
        return ResponseEntity.ok(ApiResponse.success(new AuthResponse(token, "Bearer", user.getId(), user.getEmail())));
    }

    @PostMapping("/register-otp")
    public ResponseEntity<ApiResponse<AuthResponse>> registerOtp(@Valid @RequestBody RegisterOtpRequest request) {
        User user = authService.registerWithOtp(request.fullName(), request.email(), request.password(), request.otp());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(AuthResponse.from(user, jwtService.createToken(user.getEmail()))));
    }

    public record SendOtpRequest(@NotBlank @Email @Size(max = 120) String email) { }
    public record VerifyOtpRequest(@NotBlank @Email @Size(max = 120) String email,
                                  @NotBlank @Size(min = 6, max = 6) String otp) { }
    public record RegisterOtpRequest(@NotBlank @Size(max = 100) String fullName,
                                     @NotBlank @Email @Size(max = 120) String email,
                                     @NotBlank @Size(min = 8, max = 72) String password,
                                     @NotBlank @Size(min = 6, max = 6) String otp) { }
    public record RegisterRequest(@NotBlank @Size(max = 100) String fullName,
                                  @NotBlank @Email @Size(max = 120) String email,
                                  @NotBlank @Size(min = 8, max = 72) String password) { }
    public record LoginRequest(@NotBlank @Email @Size(max = 120) String email,
                               @NotBlank @Size(max = 72) String password) { }
    public record FirebaseLoginRequest(String fullName,
                                       @NotBlank @Email @Size(max = 120) String email) { }
    public record AuthResponse(String accessToken, String tokenType, UUID userId, String email) {
        static AuthResponse from(User user, String token) {
            return new AuthResponse(token, "Bearer", user.getId(), user.getEmail());
        }
    }
}

