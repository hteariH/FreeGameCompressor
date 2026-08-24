# Build stage
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Production stage
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8090
ENV DATA_DIR=/app/data

COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
RUN mkdir -p /app/data

EXPOSE 8090
VOLUME ["/app/data"]

CMD ["node", "--experimental-sqlite", "dist/server.js"]
