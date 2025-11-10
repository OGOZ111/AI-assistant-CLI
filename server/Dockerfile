FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies (including dev) and build TypeScript
COPY package*.json ./
COPY tsconfig.json ./
# Use `npm install` here instead of `npm ci` because `npm ci` requires
# package.json and package-lock.json to be perfectly in sync. In some
# development workflows the lockfile may be out-of-date which causes
# `npm ci` to fail inside the Docker build. `npm install` will update
# the lockfile locally during the build step and proceed.
RUN npm install
# Copy project files (including src). Use a .dockerignore to keep node_modules, dist and .env out of the context.
COPY . .
RUN npm run build

# Prepare production-only node_modules in a separate folder so the final image
# doesn't need to run `npm install` (avoids network/lockfile issues during final stage).
# We already ran `npm install` above to get dev + prod deps for the build.
# Copy those node_modules and prune devDependencies in-place in the copy so
# the final image contains only production deps without making extra network calls.
RUN mkdir -p /app/prod_node_modules && \
	cp -R node_modules /app/prod_node_modules/ && \
	# copy package.json so `npm prune --production` knows which deps are prod
	cp package*.json /app/prod_node_modules/ && \
	npm --prefix /app/prod_node_modules prune --production

FROM node:20-alpine AS runner
WORKDIR /app

# Copy production node_modules prepared in builder stage
COPY --from=builder /app/prod_node_modules/node_modules ./node_modules

# Copy compiled output
COPY --from=builder /app/dist ./dist
# Copy curated static memory files from the source tree into the runtime dist folder
# The TS build doesn't emit these JSON files so copy them explicitly so the runtime
# can resolve ../memory.json as expected by the compiled code.
COPY --from=builder /app/src/memory.json ./dist/memory.json
COPY --from=builder /app/src/memory.fi.json ./dist/memory.fi.json

ENV NODE_ENV=production
EXPOSE 5000
CMD ["node", "dist/index.js"]
