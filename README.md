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
- **Microsoft SQL Server** (Database)
- **JWT** + **Cookies** for authentication
- **Multer** for file uploads

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+)
- [SQL Server](https://www.microsoft.com/en-us/sql-server/sql-server-downloads) (or Azure SQL)

### Configuration
1. Clone the repository
2. Create `server/.env` with your SQL Server credentials and secrets:
   ```env
   DATABASE_URL="sqlserver://localhost;database=AISTHEA_DB;user=sa;password=YourStrongPassword;encrypt=true;trustServerCertificate=true"
   JWT_SECRET="your-secret-key"
   REFRESH_SECRET="your-refresh-secret"
   ```
3. Copy `server/.env.example` and fill in weather + AI keys if you want live data.

### Database Setup
1. Open SQL Server Management Studio (SSMS)
2. Run the scripts in the `database` folder in order:
   - `00_schema_all.sql` (Creates all tables and relationships)
   - `01_seed_data.sql` (Inserts initial application data)

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

## 🔐 Hướng dẫn Cài đặt RBAC (Dành cho Team)

Để chạy được chức năng Phân Quyền (RBAC) mới nhất, các thành viên cần thực hiện **3 bước** sau sau khi pull code về:

### Bước 1: Cập nhật Database
Chạy file SQL migration bằng SSMS trên SQL Server cục bộ của bạn (`rbac_migration.sql` đã được tích hợp vào file chạy chung nếu bạn cài lại từ đầu):
```sql
database/rbac_migration.sql
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
