# ============================================
# A.R.I.A. Workspace - Multi-stage Docker Build
# Persistencia completa: usuarios, historial, archivos
# ============================================

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better caching
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy all source files
COPY . .

# Build frontend (Vite) and backend (esbuild)
RUN npm run build

# Stage 2: Production runtime
FROM node:20-alpine AS runtime

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Copy public assets (models, manifest, service worker)
COPY --from=builder /app/public ./public

# Create entrypoint script
RUN echo '#!/bin/sh' > /app/entrypoint.sh && \
    echo '# Ensure persistent directories exist with proper permissions' >> /app/entrypoint.sh && \
    echo 'mkdir -p /app/data /app/user_documents' >> /app/entrypoint.sh && \
    echo 'chmod -R 755 /app/data /app/user_documents' >> /app/entrypoint.sh && \
    echo '' >> /app/entrypoint.sh && \
    echo '# Copy default data if volume is empty (first run)' >> /app/entrypoint.sh && \
    echo 'if [ ! -f /app/data/users.json ]; then' >> /app/entrypoint.sh && \
    echo '  echo "First run: initializing default data..."' >> /app/entrypoint.sh && \
    echo '  cp /app/dist/default-data/*.json /app/data/ 2>/dev/null || true' >> /app/entrypoint.sh && \
    echo 'fi' >> /app/entrypoint.sh && \
    echo '' >> /app/entrypoint.sh && \
    echo '# Start the server' >> /app/entrypoint.sh && \
    echo 'exec node dist/server.cjs' >> /app/entrypoint.sh && \
    chmod +x /app/entrypoint.sh

# Set environment variables
ENV NODE_ENV=production
ENV ARIA_PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start with entrypoint
ENTRYPOINT ["/app/entrypoint.sh"]
