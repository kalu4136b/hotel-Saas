# -------------------------------------------------------------
# Stage 1: Install Dependencies
# -------------------------------------------------------------
FROM node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci

# -------------------------------------------------------------
# Stage 2: Build Next.js Application
# -------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Optional build-time environment variables for Next.js client bundles
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL

RUN npm run build
RUN npm prune --omit=dev

# -------------------------------------------------------------
# Stage 3: Production Runtime
# -------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

# Copy runtime dependencies and Next.js compiled build
COPY --chown=node:node package*.json ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/.next ./.next
COPY --chown=node:node --from=builder /app/public ./public

# Run as non-root user
USER node

# Expose Next.js port
EXPOSE 3000

# Start Next.js production server
CMD ["node_modules/.bin/next", "start", "-p", "3000"]

