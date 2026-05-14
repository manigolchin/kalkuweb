# --- Build stage ---
FROM node:22-alpine AS build

WORKDIR /app

# Install deps (cached layer)
# --legacy-peer-deps because react-helmet-async@2.0.5 hasn't bumped its
# React 19 peer dep yet but works fine in practice.
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund --legacy-peer-deps

# Copy source + build
COPY . .
RUN npm run build

# --- Runtime stage: nginx serving static SPA ---
FROM nginx:1.27-alpine AS runtime

# Remove default config, install ours
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/kalku-website.conf

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q -O- http://localhost/healthz || exit 1

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
