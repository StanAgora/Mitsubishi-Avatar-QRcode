# Builds the React/Vite client and packages it with the Express server into
# a single production image. The server serves the built client and the API
# from one process/port (see server/src/index.js).

# ---- builder: install all workspace deps and build the client bundle ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN npm ci

COPY . .

# APP_VITE_BASE_PATH lets the app be deployed under a reverse-proxy subpath
# (e.g. /avatar/) instead of domain root.
# VITE_AGORA_APP_ID must be present at *build* time — Vite inlines
# import.meta.env.VITE_* values into the static bundle, so this can't be
# supplied later via the container's runtime environment.
ARG APP_VITE_BASE_PATH=/
ARG VITE_AGORA_APP_ID
ENV APP_VITE_BASE_PATH=${APP_VITE_BASE_PATH} \
    VITE_AGORA_APP_ID=${VITE_AGORA_APP_ID}

RUN npm run build --workspace client

# ---- runtime: only the server's own deps + the built client ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY server/package.json server/package.json
RUN npm ci --omit=dev --workspace=server

COPY server ./server
COPY external/prompt.md ./external/prompt.md
COPY --from=builder /app/client/dist ./client/dist

EXPOSE 8080
CMD ["node", "server/src/index.js"]
