FROM node:22-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 3000

VOLUME ["/app/auth_info", "/app/data"]

CMD ["node", "index.js"]
