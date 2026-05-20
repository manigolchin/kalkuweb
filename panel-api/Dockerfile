FROM node:22-alpine AS build
WORKDIR /app
RUN apk add --no-cache python3 make g++ libc6-compat
COPY package.json package-lock.json* ./
RUN npm install --include=dev --no-audit --no-fund
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache python3 make g++ libc6-compat \
  && addgroup -S app && adduser -S -G app app
COPY package.json package-lock.json* ./
ENV NODE_ENV=production
RUN npm install --omit=dev --no-audit --no-fund \
  && apk del python3 make g++ \
  && npm cache clean --force
COPY --from=build /app/dist ./dist
RUN mkdir -p /app/data && chown -R app:app /app/data
USER app
ENV PORT=3000
ENV DB_PATH=/app/data/kalku.db
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/panel/health || exit 1
CMD ["node", "dist/index.js"]
