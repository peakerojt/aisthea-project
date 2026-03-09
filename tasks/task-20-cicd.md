# Task 20 - CI/CD Setup

## Trạng thái: ❌ Chưa hoàn thành

## Mô tả

Thiết lập Dockerfile và docker-compose để dự án dễ dàng deploy và chạy trên bất kỳ môi trường nào.

## Dockerfile cho Server

```dockerfile
# server/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

EXPOSE 5000
CMD ["node", "dist/server.js"]
```

## Dockerfile cho Client

```dockerfile
# client/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
```

## docker-compose.yml (Root)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: aisthea
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: aisthea
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  server:
    build: ./server
    environment:
      DATABASE_URL: postgresql://aisthea:secret@postgres:5432/aisthea
      REDIS_HOST: redis
    depends_on:
      - postgres
      - redis
    ports:
      - "5000:5000"

  client:
    build: ./client
    ports:
      - "80:80"
    depends_on:
      - server

volumes:
  postgres_data:
```

## GitHub Actions CI (tùy chọn)

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
        working-directory: server
      - run: npm run build
        working-directory: server
```

## Checklist

- [ ] Tạo `server/Dockerfile`
- [ ] Tạo `client/Dockerfile`
- [ ] Tạo `docker-compose.yml` ở root
- [ ] Tạo `client/nginx.conf`
- [ ] Test: `docker-compose up` → toàn bộ stack chạy được
- [ ] Thêm `.dockerignore` cho server và client
- [ ] (Tùy chọn) Tạo GitHub Actions workflow cho CI
