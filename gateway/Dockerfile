FROM node:22-bookworm-slim

WORKDIR /app/common
COPY common/package*.json ./
RUN npm ci
COPY common/tsconfig.json ./
COPY common/src ./src
RUN npm run build

WORKDIR /app/service
COPY gateway/package*.json ./
RUN npm ci --omit=dev
COPY gateway/ ./

ENV NODE_ENV=production
EXPOSE 10000
CMD ["npm", "start"]
