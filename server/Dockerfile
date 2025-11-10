FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies (including dev) and build TypeScript
COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci
COPY src ./src
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --production

# Copy compiled output
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
EXPOSE 5000
CMD ["node", "dist/index.js"]
