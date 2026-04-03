# Stage 1: Build frontend
FROM node:20-alpine as build-stage
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Production server
FROM node:20-alpine
WORKDIR /app
COPY server/package*.json ./server/
RUN cd server && npm install
COPY server/ ./server/
COPY --from=build-stage /app/client/dist ./client/dist

# Set production context
ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "server/index.js"]
