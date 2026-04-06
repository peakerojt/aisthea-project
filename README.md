# AISTHEA Project

A comprehensive E-commerce application built with a modern stack.

## 🏗️ Tech Stack

### Client (Frontend)
- **Vite** + **React** (TypeScript)
- **TailwindCSS** for styling
- **Lucide React** for icons
- **Framer Motion** for animations
- **React Hook Form** + **Zod** for form validation
- **React Query** for state management
- **React Router** for routing
- **Recharts** for data visualization
- **Axios** for API requests
- **i18next** for localizations

### Server (Backend)
- **Node.js** + **Express**
- **TypeScript**
- **Prisma ORM**
- **MySQL** (Railway-ready)
- **JWT** + **Cookies** for authentication
- **Multer** for file uploads

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+)
- [MySQL](https://dev.mysql.com/downloads/mysql/) for local development
- A Railway project with a MySQL service for production deployment

### Configuration
1. Clone the repository
2. Create `server/.env` with your database URL and secrets:
   ```env
   DATABASE_URL="mysql://root:password@127.0.0.1:3306/aisthea"
   JWT_SECRET="your-secret-key"
   REFRESH_SECRET="your-refresh-secret"
   ```
3. Copy `server/.env.example` and fill in OAuth, SMTP, Cloudinary, weather, and AI keys if you want live integrations.

### Database Setup
1. Ensure `DATABASE_URL` points to a MySQL database.
2. Push the Prisma schema:
   - `cd server`
   - `npx prisma db push`
3. Seed or import data:
   - Run `npx prisma db seed` for the Prisma seed data.
   - Import `server/database/03_seed_data_standard_fixed.mysql.bulk.sql` if you want the converted catalog data prepared for Railway/MySQL.

### Railway Deployment
1. Create a Railway service that points to the repo folder `server` as the `Root Directory`.
2. Provision a Railway MySQL service in the same project.
3. In the server service variables, set `DATABASE_URL` to the Railway MySQL connection string and update:
   - `CLIENT_URL`
   - `SERVER_URL`
   - `JWT_SECRET`
   - `REFRESH_SECRET`
   - any OAuth, SMTP, Cloudinary, VNPay, or AI secrets you use
4. Railway will run the server package scripts:
   - build: `npm run build`
   - start: `npm run start`
5. After the first deploy, run `npx prisma db push` against the Railway database, then import the MySQL seed file if needed.

### Run Server
```bash
cd server
npm install
npm run dev
```
The server will start on `http://localhost:5000`.

### Run Client
```bash
cd client
npm install
npm run dev
```
The client will start on `http://localhost:3000`.

## 🌤️ Weather + AI Outfit Recommendation

### Environment variables (server)
Add these into `server/.env`:
```env
WEATHER_API_KEY=your_weather_api_key
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini
MOCK_WEATHER=true
MOCK_AI=true
```
- If `MOCK_WEATHER` or `MOCK_AI` is `true`, backend will return mock data for demo.

### API Endpoints
- `GET /api/weather?lat=...&lon=...` or `GET /api/weather?city=...`
- `POST /api/outfit/recommend`

### Frontend entry
- Từ menu `Weather AI` ở header để mở tính năng.

## 🛠️ Scripts

### Server
- `npm run dev`: Run server in development mode (nodemon)
- `npm run build`: Build TypeScript to JavaScript
- `npm run start`: Run the built application
- `npm run studio`: Open Prisma Studio to view database

### Client
- `npm run dev`: Run local development server
- `npm run build`: Build for production
- `npm run preview`: Preview the production build

## 📚 Active Project Docs

Use these files as the current source of truth before continuing cleanup or checklist work:

- `README.md`: onboarding and local setup
- `ARCHITECTURE.md`: current backend/frontend structural direction
- `AUDIT_PROGRESS.md`: live migration and cleanup status
- `AISTHEA_IMPLEMENTATION_CHECKLIST_EN.md`: active execution checklist
- `docs/i18n/`: tracked i18n audits, merge notes, and reference packages kept outside runtime source folders
- `docs/decisions/`: intentional architecture and migration boundary decisions
- `docs/audits/`: focused mismatch and audit notes that should stay tracked in the repo

## 🔐 Hướng dẫn Cài đặt RBAC (Dành cho Team)

Để chạy được chức năng Phân Quyền (RBAC) mới nhất, các thành viên cần thực hiện **3 bước** sau sau khi pull code về:

### Bước 1: Cập nhật Database
Đồng bộ schema Prisma với database MySQL hiện tại:
```bash
cd server
npx prisma db push
```

### Bước 2: Cập nhật Prisma Client
Vì schema đã thay đổi (thêm bảng Permission và RolePermission), bắt buộc phải generate lại client:
```bash
cd server
npm install
npx prisma generate
```

### Bước 3: Nạp dữ liệu quyền (Seed)
Chạy lệnh sau để Prisma nạp 12 quyền cơ bản và gán cho vai trò Super Admin:
```bash
cd server
npx prisma db seed
```

Sau khi xong 3 bước trên, bạn có thể khởi động lại server (`npm run dev`) để sử dụng tính năng Phân quyền.
