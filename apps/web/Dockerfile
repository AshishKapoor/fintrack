# Stage 1: Build
FROM node:26-slim AS builder

# Node 26 no longer bundles corepack, so install pnpm directly - pinned to the
# same version as the packageManager field so local and image builds agree.
RUN npm install -g pnpm@10.34.5

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
# app/client/pft is hand-maintained; orval's output directory (app/client/gen)
# is generated on demand and is not part of the build.
RUN pnpm run build

# Stage 2: Serve
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD [ "nginx", "-g", "daemon off;" ]
