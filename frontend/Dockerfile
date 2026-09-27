# ── Stage 1: build ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copy manifests first for layer-cache efficiency
COPY package.json package-lock.json ./

RUN npm ci

# Copy the rest of the frontend source
COPY . .

# Build the production bundle (output goes to /app/dist)
RUN npm run build

# ── Stage 2: serve with Nginx ─────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

# Remove the default Nginx site
RUN rm -f /etc/nginx/conf.d/default.conf

# Paste our custom config (see below)
COPY nginx.conf /etc/nginx/conf.d/swatva.conf

# Copy the built assets from stage 1
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
