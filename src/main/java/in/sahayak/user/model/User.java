package in.sahayak.user.model;

import in.sahayak.common.persistence.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.time.LocalDate;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "users")
public class User extends BaseEntity {
    @Column(nullable = false, unique = true, length = 120)
    private String email;

    @Column(nullable = false, length = 100)
    private String fullName;

    @Column(unique = true, length = 15)
    private String phoneNumber;

    @Column(nullable = false, length = 100)
    private String passwordHash;

    private LocalDate dateOfBirth;

    @Column(nullable = false)
    private boolean active = true;

    @OneToOne(mappedBy = "user")
    private UserProfile profile;
}
