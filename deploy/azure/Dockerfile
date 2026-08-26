# Combined image for Azure App Service (Linux, single container): nginx (static app + /api
# reverse proxy) and the Node API run in the SAME container, on the SAME origin, because
# WebAuthn/passkeys require ORIGIN/RP_ID to match one public hostname (see docs/AZURE_APPSERVICE.md).
# App Service only runs one container per Web App, so this can't be split like docker-compose does.
FROM --platform=$BUILDPLATFORM node:22-alpine AS build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci 2>/dev/null || npm install
COPY frontend/ ./
# No self-hosted media volume on App Service — serve exercise images/GIFs from the CDN.
ARG VITE_IMG_BASE=https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@7455efae41b330c265e7cd4b78dfa848e7ce5ebd/images/
ARG VITE_GIF_BASE=https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@7455efae41b330c265e7cd4b78dfa848e7ce5ebd/videos/
ENV VITE_IMG_BASE=$VITE_IMG_BASE
ENV VITE_GIF_BASE=$VITE_GIF_BASE
RUN npm run build

FROM node:22-alpine
RUN apk add --no-cache nginx

WORKDIR /app/api
COPY api/package.json api/package-lock.json* ./
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev
COPY api/server.js ./

COPY --from=build /app/dist /usr/share/nginx/html
COPY deploy/azure/nginx.conf /etc/nginx/http.d/default.conf
COPY deploy/azure/start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 80
CMD ["/start.sh"]
