ARG WWWUSER=1000
ARG WWWGROUP=1000

FROM node:24-alpine AS base-alpine
WORKDIR /var/www/html
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN apk add --no-cache git \
    && corepack enable

FROM node:24-bookworm-slim AS base-debian
WORKDIR /var/www/html
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN apt-get update && apt-get install -y --no-install-recommends git curl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable

FROM base-debian AS devcontainer
USER node
CMD ["sleep", "infinity"]

FROM base-alpine AS app
ARG WWWUSER
ARG WWWGROUP
COPY --chown=${WWWUSER}:${WWWGROUP} package.json pnpm-lock.yaml* ./
USER ${WWWUSER}
CMD ["pnpm", "dev", "--inspect=0.0.0.0:9229"]

FROM base-debian AS pnpm
ARG WWWUSER
ARG WWWGROUP
ENV PNPM_HOME="/var/www/.pnpm-store"
ENV PATH="$PNPM_HOME:$PATH"
RUN mkdir -p /var/www/.pnpm-store \
    && chown -R ${WWWUSER}:${WWWGROUP} ${PNPM_HOME}
COPY --chown=${WWWUSER}:${WWWGROUP} package.json pnpm-lock.yaml* ./
USER ${WWWUSER}
CMD ["pnpm", "i", "--store-dir", "../.pnpm-store"]