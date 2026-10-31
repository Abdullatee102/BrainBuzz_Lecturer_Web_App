# Brain Buzz — Lecturer Web Application (`Quiz_Lecturer_Web_App`)

> **Notice: Pilot Release (BB-07)**
> This web application is currently in active development and pilot evaluation. Features are scoped strictly to verified lecturer authentication, overview analytics, and assigned course inspection in accordance with approved milestone contracts.

---

## Architecture Overview

`Quiz_Lecturer_Web_App` is an independent React/Vite single-page application built for university lecturers and faculty members on the Brain Buzz educational platform.

It communicates with `QuizBackend` via authorized lecturer endpoints, preserving strict separation of concerns from:
- `CodeAlpha_QuizApp` (Student Mobile Application)
- `Quiz_Web_App` (Platform Administration Portal)

---

## Technology Stack

- **Framework**: React 19 + TypeScript (~5.7)
- **Tooling & Bundler**: Vite 6
- **Styling**: Tailwind CSS 3.4 with custom academic tokens
- **Icons**: Lucide React
- **Server State & Caching**: TanStack React Query 5
- **Routing**: React Router DOM 7
- **HTTP Client**: Axios with centralized request/response interceptors and automated token rotation
- **Testing**: Node.js test runner with TypeScript execution

---

## Features Implemented (Milestone BB-07C)

### 1. Authentication & Session Management
- **Endpoint**: `POST /api/lecturer/login` (and `/api/lecturer/auth/login`).
- **Identity Enforcement**: Rejects non-lecturer roles (`STUDENT`, `SUPER_ADMIN`, etc.) with `403 Forbidden` (`Access denied. Account is not registered as an authorized lecturer.`).
- **Account State Verification**: Rejects `SUSPENDED` and `DISABLED` accounts.
- **Session Persistence**: Securely stores JWT `accessToken` (15m expiry) and `refreshToken` (7d expiry) under namespaced keys (`brainbuzz_lecturer_token`, `brainbuzz_lecturer_refresh_token`, `brainbuzz_lecturer_user`).
- **Session Hydration**: Automatically calls `GET /api/lecturer/me` on boot to verify token validity and live database state.
- **Token Rotation**: 401 Unauthorized responses trigger automated token refresh against `POST /api/auth/refresh-token`.
- **Sign Out**: Calls backend token revocation (`POST /api/auth/logout`) and flushes browser state.

### 2. Lecturer Overview Dashboard
- **Endpoint**: `GET /api/lecturer/dashboard`.
- **Welcome & Profile Header**: Displays verified name, academic email, username, affiliated faculty, and department.
- **Live Metrics**: Displays assigned course count and active academic sessions (e.g., `2025/2026`). Zero fabricated metrics.
- **Recent Course Assignments**: Quick links to recently assigned courses with level, session, and semester tags.
- **Pilot Banner**: Prominently communicates pilot status across all dashboard views.

### 3. Assigned Courses Directory
- **Endpoint**: `GET /api/lecturer/courses`.
- **Scoped Data**: Lists only course offerings actively allocated to the authenticated lecturer (`course_assignments.status = 'ACTIVE'`).
- **Search & Filtering**: Search by course code/title, filter by academic semester (`harmattan` / `rain`) and session.
- **Responsive Table**: Built following modern accessible table guidelines with sticky headers and mobile stacked card fallback.
- **Pagination**: Server-side pagination controls (`page`, `limit`, `totalPages`, `total`).

### 4. Course Details & IDOR Defense
- **Endpoint**: `GET /api/lecturer/courses/:courseId`.
- **Zero Frontend Fallback for Security**: Authorization is strictly enforced by backend `requireLecturerCourseAssignment` middleware.
- **IDOR Protection Handling**:
  - `403 Forbidden`: Displays clear academic access denial notification when viewing unassigned courses.
  - `404 Not Found`: Displays course not found state for nonexistent course IDs.
- **Permitted Question Metrics**: CBT and Theory question breakdown counts without leaking student submissions or answer keys.

---

## Directory Structure

```
Quiz_Lecturer_Web_App/
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── App.tsx
│   ├── AppRoutes.tsx
│   ├── index.css
│   ├── main.tsx
│   ├── vite-env.d.ts
│   ├── components/
│   │   ├── courses/
│   │   │   └── CourseTable.tsx
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── LecturerLayout.tsx
│   │   │   ├── PilotBanner.tsx
│   │   │   └── Sidebar.tsx
│   │   └── ui/
│   │       ├── Badge.tsx
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       ├── EmptyState.tsx
│   │       ├── ErrorState.tsx
│   │       ├── LoadingSpinner.tsx
│   │       └── PaginationControl.tsx
│   ├── context/
│   │   └── AuthContext.tsx
│   ├── lib/
│   │   ├── api.ts
│   │   └── utils.ts
│   ├── pages/
│   │   ├── CourseDetailPage.tsx
│   │   ├── CoursesPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── NotFoundPage.tsx
│   │   └── UnauthorizedPage.tsx
│   ├── tests/
│   │   └── integration.test.ts
│   └── types/
│       └── api.ts
```

---

## Getting Started

### Prerequisites

- Node.js >= 20 (v24 recommended)
- `QuizBackend` running locally on `http://localhost:5000` (or configured remote URL)

### Installation

```bash
# Clone and enter directory
cd Quiz_Lecturer_Web_App

# Install dependencies
npm install
```

### Environment Configuration

Create a `.env` file from `.env.example`:

```env
VITE_API_URL=http://localhost:5000/api
```

### Development Server

```bash
# Starts Vite dev server on port 5174
npm run dev
```

Visit [http://localhost:5174](http://localhost:5174).

### Running Production Build

```bash
npm run build
npm run preview
```

### Running Test Verification Suite

```bash
npm run test
```

---

## Security Controls

1. **Role Separation**: Non-lecturer tokens (including student and admin accounts) are blocked by both backend authorization middleware and frontend navigation guards.
2. **No IDOR Relying on UI**: Frontend directly surfaces backend `403 Forbidden` responses rather than masking endpoints.
3. **Storage Hygiene**: Namespaced keys (`brainbuzz_lecturer_*`) prevent token collisions with other Brain Buzz web applications running on the same domain.
