FROM node:20-slim as builder

WORKDIR /app

COPY package*.json ./

RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 make g++ && \
    npm ci --omit=dev && \
    rm -rf /var/lib/apt/list/*

FROM node:20-slim

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY . .

EXPOSE 3000

CMD [ "node", "app.js" ]