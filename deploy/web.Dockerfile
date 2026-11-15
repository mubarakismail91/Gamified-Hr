# Web image: builds the React app, then Caddy serves it AND reverse-proxies /api and /socket.io to
# the API, so browser, cookie and live connection all share one origin with automatic HTTPS.
FROM node:22-bookworm-slim AS build
WORKDIR /web
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.ts tsconfig.json postcss.config.js tailwind.config.ts ./
COPY public ./public
COPY src ./src
ENV VITE_API_BASE_URL=/api
RUN npm run build

FROM caddy:2
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /web/dist /srv
