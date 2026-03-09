# Task 19 - Environment Security

## Trạng thái: ❌ Chưa hoàn thành

## Mô tả

Đảm bảo tất cả secrets và credentials được lưu an toàn trong `.env` và không bị commit lên Git.

## Vấn đề hiện tại

```typescript
// ❌ Hardcode credentials ngay trong code
const JWT_SECRET = 'mysecret123';
const DB_URL = 'postgresql://user:password@localhost:5432/aisthea';
```

## Giải pháp

### 1. File `.env`

```dotenv
# Server
PORT=5000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/aisthea

# Authentication
JWT_SECRET=your-super-secret-key-here-min-32-chars
JWT_EXPIRES_IN=7d

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Email
SMTP_HOST=smtp.gmail.com
SMTP_USER=your@email.com
SMTP_PASS=your-app-password
```

### 2. File `.gitignore`

```gitignore
# Environment files - QUAN TRỌNG
.env
.env.local
.env.production
.env.staging

# Logs
logs/
*.log

# Dependencies
node_modules/
```

### 3. File `.env.example` (commit lên Git)

```dotenv
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/aisthea
JWT_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

## Checklist

- [ ] Kiểm tra `.env` đã có trong `.gitignore` chưa
- [ ] Tìm mọi hardcoded secret trong code: `grep -rn "password\|secret\|apikey" server/src/`
- [ ] Di chuyển tất cả về `.env`
- [ ] Tạo `.env.example` với placeholder values
- [ ] Kiểm tra không có `.env` nào đã bị commit: `git log --all --full-history -- .env`
- [ ] Đảm bảo `JWT_SECRET` đủ dài (>= 32 ký tự)
- [ ] Validate môi trường vars khi server khởi động

## ⚠️ LƯU Ý QUAN TRỌNG

Nếu `.env` đã bị commit lên Git, phải:
1. Xóa khỏi history: `git filter-branch` hoặc BFG Repo Cleaner
2. Rotate tất cả secrets (tạo key mới)
3. Force push lên remote
