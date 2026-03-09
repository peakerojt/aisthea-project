# AISTHEA - Audit Task List

> Dựa trên Audit Report toàn bộ repo AISTHEA (Senior Backend / Security Review).

## Tổng quan

| Khu vực | Tasks | Trạng thái |
|---------|-------|------------|
| Architecture | Task 01 | ❌ |
| Database Design | Task 02 | ❌ |
| API Design | Task 03 | ❌ |
| Security | Task 04-09 | ❌ |
| Order & Cart | Task 10-13 | ❌ |
| Error & Logging | Task 14-15 | ❌ |
| Performance | Task 16-17 | ❌ |
| Features | Task 18 | ❌ |
| DevOps | Task 19-20 | ❌ |

---

## Danh sách Tasks

### 🏗️ Architecture & Design

| # | Task | File | Ưu tiên |
|---|------|------|---------|
| 01 | Architecture Review (Clean Architecture, Repository pattern) | [task-01-architecture.md](./task-01-architecture.md) | 🔴 Cao |
| 02 | Database Design Review (bảng, quan hệ, index) | [task-02-database-design.md](./task-02-database-design.md) | 🔴 Cao |
| 03 | API Design Review (RESTful, Pagination) | [task-03-api-design.md](./task-03-api-design.md) | 🔴 Cao |

### 🔐 Security

| # | Task | File | Ưu tiên |
|---|------|------|---------|
| 04 | Input Validation (Zod) | [task-04-security-validation.md](./task-04-security-validation.md) | 🔴 Cao |
| 05 | Authorization Middleware (auth + admin) | [task-05-security-authorization.md](./task-05-security-authorization.md) | 🔴 Cao |
| 06 | SQL Injection Prevention | [task-06-security-sql-injection.md](./task-06-security-sql-injection.md) | 🔴 Cao |
| 07 | Rate Limiting (brute force protection) | [task-07-security-rate-limit.md](./task-07-security-rate-limit.md) | 🟡 Trung bình |
| 08 | Password Hashing (bcrypt) | [task-08-security-password.md](./task-08-security-password.md) | 🔴 Cao |
| 09 | File Upload Security | [task-09-security-file-upload.md](./task-09-security-file-upload.md) | 🟡 Trung bình |

### 🛒 E-commerce Workflow

| # | Task | File | Ưu tiên |
|---|------|------|---------|
| 10 | Order Workflow (State Machine) | [task-10-order-workflow.md](./task-10-order-workflow.md) | 🔴 Cao |
| 11 | Cart System (DB-backed) | [task-11-cart-system.md](./task-11-cart-system.md) | 🔴 Cao |
| 12 | Stock Control | [task-12-stock-control.md](./task-12-stock-control.md) | 🔴 Cao |
| 13 | Database Transactions | [task-13-transactions.md](./task-13-transactions.md) | 🔴 Cao |

### 🛠️ Backend Quality

| # | Task | File | Ưu tiên |
|---|------|------|---------|
| 14 | Error Handling (chuẩn hóa response lỗi) | [task-14-error-handling.md](./task-14-error-handling.md) | 🟡 Trung bình |
| 15 | Logging (Winston + Morgan) | [task-15-logging.md](./task-15-logging.md) | 🟡 Trung bình |

### ⚡ Performance & Features

| # | Task | File | Ưu tiên |
|---|------|------|---------|
| 16 | Caching (Redis) | [task-16-caching.md](./task-16-caching.md) | 🟢 Thấp |
| 17 | Image Storage (Cloudinary) | [task-17-image-storage.md](./task-17-image-storage.md) | 🟡 Trung bình |
| 18 | Admin Panel | [task-18-admin-panel.md](./task-18-admin-panel.md) | 🟡 Trung bình |

### 🚀 DevOps

| # | Task | File | Ưu tiên |
|---|------|------|---------|
| 19 | Environment Security (.env, secrets) | [task-19-env-security.md](./task-19-env-security.md) | 🔴 Cao |
| 20 | CI/CD (Docker + docker-compose) | [task-20-cicd.md](./task-20-cicd.md) | 🟢 Thấp |

---

## Thứ tự ưu tiên triển khai

### Phase 1 — Bắt buộc (Security & Core)
1. Task 06 — SQL Injection
2. Task 08 — Password Hashing
3. Task 19 — Environment Security
4. Task 04 — Input Validation
5. Task 05 — Authorization

### Phase 2 — E-commerce Logic
6. Task 12 — Stock Control
7. Task 13 — Transactions
8. Task 10 — Order Workflow
9. Task 13 — Cart System

### Phase 3 — Quality & Architecture
10. Task 01 — Architecture Refactor
11. Task 02 — Database Index
12. Task 03 — API Design
13. Task 14 — Error Handling
14. Task 07 — Rate Limiting

### Phase 4 — Production Ready
15. Task 15 — Logging
16. Task 17 — Image Storage
17. Task 16 — Redis Cache
18. Task 18 — Admin Panel
19. Task 20 — CI/CD
