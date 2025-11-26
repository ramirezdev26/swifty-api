# Build stage
FROM node:22-alpine AS build

# Install build dependencies
RUN apk add --no-cache --virtual .build-deps \
    python3 \
    make \
    g++ \
    git

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci --only=production --no-audit --no-fund --ignore-scripts && \
    npm cache clean --force

# Production stage
FROM node:22-alpine AS production

# Install security updates and required packages
RUN apk add --no-cache --virtual .runtime-deps \
    dumb-init \
    curl \
    openssl \
    && apk add --no-cache --upgrade \
    && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

WORKDIR /app

# Copy package files and node_modules from build stage
COPY --from=build --chown=nextjs:nodejs /app/package*.json ./
COPY --from=build --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy application source code and scripts
COPY --chown=nextjs:nodejs ./src ./src
COPY --chown=nextjs:nodejs ./scripts ./scripts
COPY --chown=nextjs:nodejs ./src/index.js ./

# Generate certificates if LOCAL_CERTIFICATES is true
RUN mkdir -p /app/certs && \
    if [ "$LOCAL_CERTIFICATES" = "true" ]; then \
        echo "Generating self-signed certificates..." && \
        openssl req -x509 -newkey rsa:4096 -keyout /app/certs/server.key -out /app/certs/server.crt -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost" && \
        chmod 600 /app/certs/server.key && \
        echo "Certificates generated successfully"; \
    fi

# Switch to non-root user
USER nextjs

# Expose the application port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/index.js"]
