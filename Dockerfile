# ── Stage 1: build with Maven ─────────────────────────────────────────────────
FROM eclipse-temurin:21-jdk-alpine AS builder

WORKDIR /build

# Copy Maven wrapper + pom first for layer-cache efficiency
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./

# Download dependencies (cached unless pom.xml changes)
RUN ./mvnw dependency:go-offline -q

# Copy source and build (skip tests — run them in CI separately)
COPY src ./src
RUN ./mvnw package -DskipTests -q

# ── Stage 2: run with JRE only (smaller image) ────────────────────────────────
FROM eclipse-temurin:21-jre-alpine AS runner

WORKDIR /app

# Non-root user for security
RUN addgroup -S swatva && adduser -S swatva -G swatva
USER swatva

COPY --from=builder /build/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
