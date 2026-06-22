FROM node:20-alpine AS builder
WORKDIR /app
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci
COPY backend/tsconfig.json ./
# Only copy production source files — exclude seed scripts, test files, and utilities
COPY backend/src/index.ts backend/src/db.ts backend/src/email.ts backend/src/migrate.ts backend/src/redis.ts ./src/
COPY backend/src/routes/ ./src/routes/
COPY backend/sql/ ./sql/
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/sql ./sql
RUN mkdir -p /app/uploads && chown appuser:appuser /app/uploads
USER appuser
EXPOSE 3001
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
