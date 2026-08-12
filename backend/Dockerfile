FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS deps
WORKDIR /app
# Present in case any production dependency turns out to be native (bcrypt etc.) — the
# toolchain is discarded with this stage rather than shipped.
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
# ⚠️ SSL_KEY_PATH / SSL_CERT_PATH are deliberately NOT set here. Traefik terminates TLS;
# main.ts serves plain HTTP when those are unset. See the comment there.
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
