# syntax=docker/dockerfile:1
FROM node:22-alpine AS build

ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0

RUN corepack enable && corepack prepare pnpm@11.21.0 --activate

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY index.html ./
COPY src ./src
RUN pnpm build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/health >/dev/null || exit 1
