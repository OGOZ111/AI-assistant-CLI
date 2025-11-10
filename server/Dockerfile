FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies (including dev) and build TypeScript
COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci
COPY src ./src
RUN npm run build

# Prepare production-only node_modules in a separate folder so the final image
# doesn't need to run `npm ci` (avoids network/lockfile issues during final stage).
RUN npm ci --production --prefix /app/prod_node_modules

FROM node:20-alpine AS runner
WORKDIR /app

# Copy production node_modules prepared in builder stage
COPY --from=builder /app/prod_node_modules/node_modules ./node_modules

# Copy compiled output
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
EXPOSE 5000
CMD ["node", "dist/index.js"]
