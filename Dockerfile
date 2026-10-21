FROM node:22-bookworm-slim
ARG SERVICE
WORKDIR /app/common
COPY common/package*.json ./
RUN npm install
COPY common/tsconfig.json ./
COPY common/src ./src
RUN npm run build
WORKDIR /app/service
COPY $SERVICE/package*.json ./
RUN npm install
COPY $SERVICE/ ./
CMD ["npm", "start"]
