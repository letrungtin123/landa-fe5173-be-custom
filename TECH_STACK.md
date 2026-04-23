# 🛠️ Tech Stack — L&A Onboarding E-learning Platform

> **Project**: A-LA-DEMO  
> **Mục đích**: Hệ thống đào tạo nhân viên mới (Onboarding) cho Le & Associates Holdings  
> **Updated**: 2026-04-22

---

## 📐 Kiến trúc tổng quan

```
┌─────────────────────────────────────────────────────────────┐
│                    Users (Browser)                          │
├──────────────────────┬──────────────────────────────────────┤
│   Learner            │   Admin / Mentor                    │
│   ↓                  │   ↓                                 │
│   React FE           │   Open edX Studio UI               │
│   localhost:5173     │   studio.local.openedx.io           │
├──────────────────────┴──────────────────────────────────────┤
│              Vite Dev Proxy (/api, /oauth2)                 │
├─────────────────────────────────────────────────────────────┤
│           Open edX LMS (local.openedx.io)                  │
│           ├── REST APIs (/api/*)                           │
│           ├── OAuth2 Authentication                        │
│           ├── Course Management                            │
│           └── Progress Tracking                            │
├─────────────────────────────────────────────────────────────┤
│           Docker (Tutor) via WSL2                           │
│           ├── MySQL + MongoDB                              │
│           ├── Redis (Cache)                                │
│           ├── Meilisearch (Search)                         │
│           └── SMTP (Email)                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎨 Frontend Stack

| Công nghệ | Version | Vai trò |
|------------|---------|---------|
| **React** | ^19.2.4 | UI library chính |
| **TypeScript** | ~6.0.2 | Type safety |
| **Vite** | ^8.0.4 | Build tool + Dev server + Proxy |
| **React Router DOM** | ^7.14.1 | Client-side routing |
| **Zustand** | ^5.0.12 | Global state management (Auth, Theme) |
| **TanStack React Query** | ^5.99.0 | Server state management (API caching, polling) |
| **Axios** | ^1.15.1 | HTTP client với interceptors (JWT auth) |
| **Tailwind CSS** | ^3.4.19 | Utility-first CSS framework |
| **Framer Motion** | ^12.38.0 | Animation library |
| **Radix UI** | multiple | Accessible headless UI components |
| **Lucide React** | ^1.8.0 | Icon library |
| **Recharts** | ^3.8.1 | Data visualization (charts) |
| **CVA** (class-variance-authority) | ^0.7.1 | Component variant management |

### Ưu điểm Frontend

| # | Ưu điểm | Chi tiết |
|---|---------|----------|
| 1 | **Performance vượt trội** | Vite 8 + React 19 cho HMR siêu nhanh (~50ms), production build tối ưu với tree-shaking |
| 2 | **Type Safety** | TypeScript 6.0 đảm bảo phát hiện lỗi compile-time, giảm runtime errors |
| 3 | **State management gọn nhẹ** | Zustand (~1KB) nhẹ hơn Redux rất nhiều, API đơn giản, tích hợp persist middleware |
| 4 | **Server state tối ưu** | React Query tự động cache, refetch, polling — giảm boilerplate cho API calls |
| 5 | **UI Premium** | Radix UI (accessible) + Tailwind (rapid styling) + Framer Motion (smooth animations) |
| 6 | **Component reusability** | CVA + Radix cho phép tạo component variants nhất quán, dễ maintain |
| 7 | **Mock data fallback** | Khi API không available, FE tự fallback về mock data — dev experience tốt |
| 8 | **Dev proxy** | Vite proxy giải quyết CORS hoàn toàn trong development |

### Nhược điểm Frontend

| # | Nhược điểm | Giải pháp / Lưu ý |
|---|-----------|-------------------|
| 1 | **React 19 còn mới** | Một số thư viện third-party chưa fully support React 19 |
| 2 | **Tailwind verbose** | Class names dài, đôi khi khó đọc — giảm bớt bằng CVA components |
| 3 | **Bundle size** | Framer Motion + Recharts + Radix khá nặng (~200KB gzipped) — cần lazy loading |
| 4 | **No SSR** | Vite SPA thuần client-side rendering — không có SEO server-side (OK cho internal app) |
| 5 | **No testing** | Chưa có unit tests / e2e tests — cần thêm Vitest + Playwright |
| 6 | **Hardcoded mock data** | `src/data/mock.ts` cần dọn dẹp sau khi API ổn định |

---

## 🔧 Backend Stack (Open edX)

| Công nghệ | Vai trò |
|------------|---------|
| **Open edX** (Sumac/Teak release) | LMS platform chính |
| **Tutor** | Deployment tool cho Open edX (Docker-based) |
| **Django** | Web framework (Python) — powering Open edX |
| **MySQL** | Database chính cho user/course data |
| **MongoDB** | Database cho content/modulestore |
| **Redis** | Caching layer |
| **Meilisearch** | Full-text search engine |
| **Caddy** | Reverse proxy + auto HTTPS |
| **Docker** | Container runtime (via WSL2 trên Windows) |

### Ưu điểm Backend (Open edX)

| # | Ưu điểm | Chi tiết |
|---|---------|----------|
| 1 | **Enterprise-grade LMS** | Được sử dụng bởi Harvard, MIT, các tổ chức lớn toàn cầu |
| 2 | **Studio UI sẵn có** | Admin/Mentor dùng Studio tạo course, quiz, video mà **không cần code** |
| 3 | **REST API đầy đủ** | APIs cho auth, courses, enrollment, progress, blocks, grades |
| 4 | **OAuth2 built-in** | Authentication chuẩn công nghiệp (password grant, JWT/Bearer tokens) |
| 5 | **Progress tracking** | Completion tracking, grading tự động cho quiz/assignment |
| 6 | **Scalable** | Kiến trúc microservice, dễ scale horizontal |
| 7 | **Extensible** | Plugin system (XBlocks) cho phép tạo content types mới |
| 8 | **Multi-language** | Hỗ trợ đa ngôn ngữ (i18n) built-in |

### Nhược điểm Backend (Open edX)

| # | Nhược điểm | Giải pháp / Lưu ý |
|---|-----------|-------------------|
| 1 | **Rất nặng** | Yêu cầu **≥8GB RAM**, ~20GB disk — không phù hợp máy yếu |
| 2 | **Khởi động lâu** | `tutor local launch` lần đầu mất 15-30 phút |
| 3 | **Phức tạp** | Hệ thống lớn, nhiều services — debugging khó nếu không quen Django |
| 4 | **Tài liệu API rời rạc** | REST API docs không tập trung, phải tìm hiểu qua nhiều nguồn |
| 5 | **CORS phức tạp** | Cần proxy hoặc config CORS riêng cho FE custom |
| 6 | **Customization hạn chế** | Theme/UI customization cần kiến thức Django template + Open edX internals |
| 7 | **Version upgrade khó** | Upgrade giữa các release (Sumac → Teak) có thể break compatibility |
| 8 | **Windows support kém** | Phải chạy qua WSL2, không support native Windows |

---

## 🔌 API Integration Layer

| Layer | File(s) | Mô tả |
|-------|---------|-------|
| **Config** | `src/config/env.ts`, `.env.local` | LMS URL, OAuth2 credentials |
| **HTTP Client** | `src/api/client.ts` | Axios instance + Bearer token interceptor |
| **Auth API** | `src/api/auth.ts` | OAuth2 login, getUserMe, getUserAccount |
| **Courses API** | `src/api/courses.ts` | Course list, detail, blocks, enrollment |
| **Blocks API** | `src/api/blocks.ts` | XBlock content (video/quiz/html) |
| **Progress API** | `src/api/progress.ts` | Completion tracking, grades |
| **Notifications API** | `src/api/notifications.ts` | Notifications CRUD |
| **Types** | `src/api/types.ts` | TypeScript interfaces cho tất cả API responses |
| **Transformers** | `src/transformers/*.ts` | Convert Open edX data → FE data models |

### Authentication Flow

```
User → LoginPage → POST /oauth2/access_token (via Vite proxy)
                          ↓
                   { access_token, token_type: "Bearer", expires_in: 36000 }
                          ↓
                   GET /api/user/v1/me → { username, is_staff }
                          ↓
              ┌── is_staff=true  → window.location = Studio UI
              └── is_staff=false → navigate("/dashboard")
```

---

## 🔧 Dev Tools & Infrastructure

| Tool | Version | Vai trò |
|------|---------|---------|
| **ESLint** | ^9.39.4 | Code linting |
| **PostCSS** | ^8.5.10 | CSS processing |
| **Autoprefixer** | ^10.5.0 | CSS vendor prefixes |
| **tailwindcss-animate** | ^1.0.7 | Animation utilities cho Tailwind |
| **WSL2** (Ubuntu) | — | Linux environment cho Docker/Tutor |
| **Docker Desktop** | — | Container runtime |

---

## 👥 User Accounts đã tạo

### Open edX Users

| Username | Email | Password | Role | Quyền hạn | Tạo bằng lệnh |
|----------|-------|----------|------|-----------|----------------|
| **superadmin** | superadmin@la.vn | *(tự đặt khi tạo)* | **Superuser** | Toàn quyền: Django Admin, Studio, All APIs | `tutor local run lms python manage.py lms createsuperuser --username superadmin --email superadmin@la.vn` |
| **learner1** | learner1@la.vn | `Learner@123` | **Learner** | Xem courses, học bài, làm quiz, xem progress | Django shell: `User.objects.get_or_create(...)` + `set_password(...)` |
| **mentor1** | mentor1@la.vn | `Mentor@123` | **Staff** | Quản lý courses trên Studio, tạo content | Django shell: `User.objects.get_or_create(...)` + `set_password(...)` + `is_staff=True` |

### Phân quyền chi tiết

| Chức năng | superadmin | mentor1 | learner1 |
|-----------|:----------:|:-------:|:--------:|
| Django Admin (`/admin/`) | ✅ | ❌ | ❌ |
| Studio UI (tạo/edit courses) | ✅ | ✅ | ❌ |
| FE React Dashboard | ✅* | ✅* | ✅ |
| Xem courses & học bài | ✅ | ✅ | ✅ |
| Enrollment management | ✅ | ✅ | ❌ |
| OAuth2 app management | ✅ | ❌ | ❌ |
| Waffle flags management | ✅ | ❌ | ❌ |

> *\* Staff users (superadmin, mentor1) khi login từ FE React sẽ tự động redirect sang Studio UI.*

### OAuth2 Application

| Field | Value |
|-------|-------|
| App Name | `LA-Elearning-Frontend` |
| Client ID | `la-elearning-fe` |
| Client Secret | `la-elearning-secret-2026` |
| Grant Type | `password` |
| Redirect URI | `http://localhost:5173/auth/callback` |
| Token Type | `Bearer` |
| Token Expiry | 36000s (10 giờ) |
| Owner | `superadmin` |

### URLs truy cập

| Service | URL | Mô tả |
|---------|-----|-------|
| **FE React** | http://localhost:5173 | Frontend cho Learner |
| **LMS** | http://local.openedx.io | Open edX LMS |
| **Studio** | http://studio.local.openedx.io | Content management cho Admin/Mentor |
| **Django Admin** | http://local.openedx.io/admin/ | Database admin panel |
| **Meilisearch** | http://meilisearch.local.openedx.io | Search service |
| **MFE Apps** | http://apps.local.openedx.io | Open edX Micro-frontends |

---

## 📊 So sánh tổng thể

### Điểm mạnh của kiến trúc hiện tại

1. **Tách biệt FE/BE rõ ràng** — FE custom (React) cho learner UX tốt nhất, Studio cho admin không cần code
2. **API-first approach** — FE giao tiếp qua REST API, dễ thay thế/scale từng phần
3. **Mock fallback** — Dev FE không phụ thuộc vào BE, tăng tốc development
4. **Modern stack** — React 19 + TypeScript + Vite = DX tốt nhất hiện tại
5. **Enterprise backend** — Open edX đã proven ở quy mô lớn

### Điểm cần cải thiện

1. **Testing** — Cần thêm unit tests (Vitest) và e2e tests (Playwright)
2. **Error handling** — Cần UI fallback tốt hơn khi API lỗi (error boundaries, toast notifications)
3. **Token refresh** — Chưa có auto-refresh token khi hết hạn (hiện tại expiry 10h)
4. **Production deployment** — Cần setup CI/CD, env configs cho staging/production
5. **Monitoring** — Cần thêm logging, error tracking (Sentry) cho production
6. **Notifications** — API notifications đang 404, cần verify endpoint hoặc enable feature flag
