# Stage 1: Build frontend
FROM node:20-alpine AS build-stage
WORKDIR /app

# Přidání build argumentů pro Vite
ARG VITE_APPWRITE_ENDPOINT
ARG VITE_APPWRITE_PROJECT_ID
ENV VITE_APPWRITE_ENDPOINT=$VITE_APPWRITE_ENDPOINT
ENV VITE_APPWRITE_PROJECT_ID=$VITE_APPWRITE_PROJECT_ID

COPY shared/ ./shared/
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Production server
FROM node:20-alpine
WORKDIR /app
COPY shared/ ./shared/
COPY server/package*.json ./server/
RUN cd server && npm install
COPY server/ ./server/
COPY --from=build-stage /app/client/dist ./client/dist

ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "server/index.js"]
