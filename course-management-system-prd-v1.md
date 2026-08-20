# Product Requirements Document
## Online Course Management System — 2-Week MVP

**Version:** 1.0
**Team:** 1–2 developers
**Timeline:** 10 working days
**Purpose:** Training project — build and deploy a real full-stack app end to end

---

## 1. Scope note

This is a deliberately small build. Ten days is the constraint, and the scope was set to fit it rather than trimmed down later.

**Deliberately excluded:** course modules, progress tracking, draft/published status, course search, thumbnail uploads, admin pages, pagination.

**Included:** auth, course CRUD, lessons, enrollment, lesson viewer, and deployment.

Each excluded item costs roughly a day and teaches something the included features already teach. Section 12 lists the best additions if time allows.

---

## 2. Goals

### Product
An instructor creates a course, adds lessons to it, and publishes it. A student browses courses, enrolls, and reads the lessons.

### Learning
By day 10 the team should have practiced:

| Area | What they learn |
|---|---|
| Frontend | React components, routing, forms, protected routes, calling an API |
| Backend | REST design, Express middleware, validation, auth guards, ownership checks |
| Database | Schema design, foreign keys, joins, unique constraints |
| Auth | Cookie sessions, token verification, role-based access |
| Delivery | Git workflow, env vars, a real production deploy |

### Explicit non-goal
Building a polished product. This is a teaching artifact. Working and deployed beats feature-rich and local.

---

## 3. Stack

| Layer | Choice |
|---|---|
| Frontend | React (Vite) + Tailwind CSS + React Router |
| Backend | Node.js + Express.js |
| Database + Auth | Supabase (Postgres) |
| Validation | Zod |

**Not using:** TypeScript, Redux, Docker, component libraries, test frameworks. All of these are worth learning — none of them fit in ten days.

**Lesson content format:** markdown, rendered with `react-markdown`. A rich text editor is a day of work and teaches nothing.

### 3.1 The one architecture rule

> **React never talks to Supabase. Express is the only thing holding the Supabase key.**

```
React  ──email + password──►  Express  ──►  Supabase Auth
React  ◄──httpOnly cookies──  Express  ◄──  tokens
React  ──request + cookie──►  Express  ──verify──►  Supabase DB
```

Supabase ships an auto-generated REST API that would let React query the database directly. If anyone uses it, the backend half of this project disappears. Hold this rule in code review — it is the single decision that determines whether the training works.

### 3.2 Backend folder structure

Give the team this on day 1. Express provides no structure of its own, and juniors will write 300-line route files if allowed.

```
src/
  routes/       -> URL definitions only
  controllers/  -> reads req, sends res
  services/     -> business logic + database calls
  middleware/   -> auth, validation, error handling
```

Two rules: **routes never touch the database**, and **services never touch `req` or `res`**.

---

## 4. Roles

| Role | Can do |
|---|---|
| **Student** | Browse courses, enroll and unenroll, read lessons |
| **Instructor** | All of the above, plus create/edit/delete **their own** courses and lessons |

No admin role in this version. Promote a user to instructor by editing the row in the Supabase dashboard — a manual step is fine at this scale.

---

## 5. Features

Seven tickets. Each one is a day or less.

### F-1 — Register
Email, password, full name. Password minimum 8 characters. Duplicate email returns a clear error. New users get the `student` role. On success, set cookies and redirect to the course list.

### F-2 — Login / logout
Wrong credentials return a generic error that does not reveal whether the email exists. Session survives a page refresh. Logout clears cookies.

### F-3 — Protected routes
Logged-out users hitting a protected page are redirected to login. Students hitting an instructor page get a 403. **The API enforces this independently** — a UI-only check is not a check.

### F-4 — Course CRUD (instructor)
Create with title (5–120 chars) and description, both required. Edit and delete restricted to the owner. Delete asks for confirmation and cascades to lessons and enrollments. An instructor dashboard lists my courses with their lesson counts.

### F-5 — Lessons (instructor)
Add lessons to a course: title, markdown content, optional video URL. Lessons have an explicit `position` and render in that order. Edit and delete restricted to the course owner.

Reordering is optional — build it only if day 7 finishes early.

### F-6 — Enroll and unenroll
One click, free, instant. Enrolling twice is blocked by a database unique constraint, not just by hiding the button. Instructors cannot enroll in their own course.

Students can unenroll from their own enrollment, with a confirmation prompt. The enrollment row is deleted outright — there is no progress to preserve in this version. Re-enrolling later is allowed and starts clean.

### F-7 — Lesson viewer
Accessible only to enrolled students and the owning instructor. Shows the lesson content with a sidebar listing all lessons in the course, current one highlighted. Previous / Next navigation.

---

## 6. Data model

Four tables. `auth.users` is managed by Supabase.

```
profiles
  id          uuid  PK, references auth.users(id) on delete cascade
  full_name   text  not null
  role        text  not null default 'student'   -- student | instructor
  created_at  timestamptz default now()

courses
  id             uuid  PK default gen_random_uuid()
  instructor_id  uuid  FK -> profiles(id) on delete cascade
  title          text  not null
  description    text
  created_at     timestamptz default now()

lessons
  id          uuid  PK
  course_id   uuid  FK -> courses(id) on delete cascade
  title       text  not null
  content     text
  video_url   text
  position    int   not null
  unique (course_id, position)

enrollments
  id           uuid  PK
  course_id    uuid  FK -> courses(id) on delete cascade
  student_id   uuid  FK -> profiles(id) on delete cascade
  enrolled_at  timestamptz default now()
  unique (course_id, student_id)
```

**Indexes:** `courses(instructor_id)`, `lessons(course_id)`, `enrollments(student_id)`.

Write these as migration files using the Supabase CLI and commit them. Clicking tables into existence in the dashboard is not how real teams work, and it is worth demonstrating that on day 1.

---

## 7. API

Base path `/api`. JSON in, JSON out. Session travels in an httpOnly cookie.

### Auth
```
POST   /api/auth/register     public
POST   /api/auth/login        public
POST   /api/auth/refresh      public
POST   /api/auth/logout       any logged-in user
GET    /api/auth/me           any logged-in user
```

### Courses
```
GET    /api/courses           any logged-in user
GET    /api/courses/:id       any logged-in user
GET    /api/courses/mine      instructor
POST   /api/courses           instructor
PATCH  /api/courses/:id       owner
DELETE /api/courses/:id       owner
```

### Lessons
```
POST   /api/courses/:id/lessons   owner
GET    /api/lessons/:id           enrolled student or owner
PATCH  /api/lessons/:id           owner
DELETE /api/lessons/:id           owner
```

### Enrollment
```
POST   /api/courses/:id/enroll    student
GET    /api/enrollments/mine      student
DELETE /api/enrollments/:id       student (own enrollment only)
```

### Response shape

Success:
```json
{ "data": { } }
```

Error:
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Title is required" } }
```

Codes: `200` ok, `201` created, `400` validation, `401` not logged in, `403` wrong role or not owner, `404` not found, `409` already enrolled, `500` server error.

Every route runs: auth middleware → ownership check → Zod validation → controller → central error handler. One error handler, not a `try/catch` pasted into every controller.

---

## 8. Auth implementation

The part most likely to eat a day it shouldn't.

### Cookies
Express sets two after a successful login — access token (~1 hour) and refresh token (long-lived):

```js
res.cookie('access_token', session.access_token, {
  httpOnly: true,     // JavaScript cannot read it
  secure: true,       // HTTPS only
  sameSite: 'none',   // frontend and backend are on different domains
  maxAge: 60 * 60 * 1000
});
```

React never sees a token. The browser carries a cookie it cannot read.

### Middleware
Read the cookie, verify the signature **locally**, attach the user to `req`. Do not call `supabase.auth.getUser()` on every request — that adds a network round trip to every single call and the app will feel slow. Check the project's JWT settings in the Supabase dashboard for how to verify; newer projects use a JWKS URL, older ones a shared secret.

### Four things that will cost you time

1. **CORS with cookies.** Both sides must opt in: `cors({ origin: <frontend url>, credentials: true })` on Express, and `credentials: 'include'` on every fetch. Missing either produces a mystery 401.
2. **Token refresh.** The Supabase SDK normally handles this in the browser; you have opted out, so you own it. Write an axios interceptor once: on a 401, call `/api/auth/refresh`, retry once, log out if that also fails.
3. **Role lookup.** Read the role from `profiles` in middleware rather than trusting a claim in the token.
4. **Orphaned accounts.** Supabase creates the auth user; the `profiles` row is a separate write. If the second write fails you get an account that can log in but has no name or role. Handle it with a Postgres trigger on `auth.users`, or delete the auth user on failure.

That last one is a genuinely good teaching moment about two writes that should be one.

---

## 9. Frontend pages

| Route | Access | Purpose |
|---|---|---|
| `/login`, `/register` | Public | Auth |
| `/courses` | Logged in | Course list |
| `/courses/:id` | Logged in | Detail + enroll button |
| `/my-courses` | Student | Enrolled courses, with unenroll |
| `/learn/:courseId/:lessonId` | Enrolled | Lesson viewer + sidebar |
| `/instructor` | Instructor | My courses |
| `/instructor/courses/new` | Instructor | Create course |
| `/instructor/courses/:id/edit` | Instructor | Edit course + manage lessons |

**Requirements:** works down to 375px wide; every async action shows a loading state; every failed request shows a readable message; empty states are written, not blank ("No courses yet — create your first one").

---

## 10. Ten-day plan

| Day | Deliverable |
|---|---|
| 1 | Repos, Supabase project, migrations, Express skeleton with `/health`, React app with Tailwind and routing |
| **2** | **Deploy both to production.** Empty app, real URL. |
| 3 | Auth backend: register, login, logout, refresh, cookies, middleware |
| 4 | Auth frontend: forms, protected routes, axios interceptor |
| 5 | Course API: CRUD with ownership checks |
| 6 | Course UI: instructor dashboard, create and edit forms |
| 7 | Lessons: API and UI |
| 8 | Enroll, course list, course detail, lesson viewer |
| 9 | Error states, empty states, mobile pass |
| 10 | Bug bash, final deploy, walkthrough |

**Day 2 is the one to defend.** Deployment always gets pushed to the end, and at the end it does not happen. Deploy while the app is empty and trivial to debug; after that every day ships to a real URL.

**Definition of done for a ticket:** it works, errors are handled, it works on mobile, no secrets committed, it is deployed.

---

## 11. Deployment

| Piece | Where |
|---|---|
| Frontend | Vercel |
| Backend | Render or Railway |
| Database + Auth | Supabase |

One environment. Two would be correct practice, but at ten days the setup cost is not repaid.

Note: the Supabase free tier pauses a project after about a week of inactivity. Expect this after a break.

**Secrets:** everything in `.env`, gitignored, with a committed `.env.example` listing every key.

**Git workflow:** pull latest `main` before starting, branch as `feature/course-crud`, commit once when the change is done, open a PR. With two people, pair on the hard parts and review the rest. With one person, still open PRs — the habit is part of the training.

---

## 12. Out of scope

Payments · quizzes · certificates · comments · progress tracking · search · thumbnails · admin pages · course modules · draft/published status · email notifications · ratings · analytics · TypeScript · automated tests.

If day 10 arrives early, the best additions in order: progress tracking, then draft/published status, then search.

---

## 13. Decisions

**Internal to one organization.** Not a public marketplace. Nothing is browsable while logged out — the only public routes are login, register, and refresh. Everything else, including the course list, requires a session.

This makes the project slightly *easier*: there is no logged-out course browsing to build, and every page can assume a user exists. It also means `requireAuth` sits on nearly every route, so getting the middleware right on day 3 pays off everywhere after.

Registration stays open to anyone with the link. Locking sign-up to a company email domain is one line of validation if you want it, but it is not required for the training.

**Students can unenroll.** The enrollment row is deleted. There is no progress data to orphan in this version. If progress tracking gets added later, revisit this — soft-delete would then be the better choice.

**Next.js is undecided.** It does not affect this project either way. Worth revisiting after day 10: if the team's real work turns out to be Next.js, rebuilding this same app in it makes an excellent project #2, and the comparison teaches more than either version alone.
