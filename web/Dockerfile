# Stage 1: Build
FROM node:22-slim AS builder

# pnpm version comes from the "packageManager" field in package.json, so the
# build is reproducible instead of tracking whatever "latest" happens to be.
RUN corepack enable

WORKDIR /app

# Copy manifests first so dependency installation is cached
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

# Optional analytics. Empty by default: a self-hosted build reports to nobody.
ARG VITE_UMAMI_SCRIPT_URL=""
ARG VITE_UMAMI_WEBSITE_ID=""
ENV VITE_UMAMI_SCRIPT_URL=$VITE_UMAMI_SCRIPT_URL
ENV VITE_UMAMI_WEBSITE_ID=$VITE_UMAMI_WEBSITE_ID

# NOTE: `pnpm orval` is deliberately NOT run here. The API client under
# app/client/pft is hand-maintained; regenerating it from schema/pft.yaml (which
# does not describe /api/v1/finance/*) would overwrite the working client.
RUN pnpm run build

# Stage 2: Serve
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD [ "nginx", "-g", "daemon off;" ]
