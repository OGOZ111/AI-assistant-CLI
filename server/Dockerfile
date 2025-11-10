FROM node:18-alpine AS base
WORKDIR /app

# Install only production deps for smaller image
FROM base AS deps
COPY package*.json ./
RUN npm ci --production

FROM base AS runner
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
EXPOSE 5000
CMD ["node", "index.js"]
