# User Stories — Online Course Management System
**Companion to:** PRD v1.0 · **Timeline:** 10 working days · **Team:** 1–2 developers

---

## How to use this

31 tickets, grouped into 8 epics that follow the ten-day plan. Each is sized at half a day or less so a stuck ticket never blocks a whole day.

**Format:** every ticket has an ID, a story, acceptance criteria as checkboxes, and its dependencies. Copy each one into Jira, Trello, Linear, or GitHub Issues as-is.

**A note on the setup epic:** CMS-01 through CMS-04 are written as tasks, not user stories. Forcing "As a developer, I want a repository…" onto infrastructure work adds ceremony without adding clarity. Every other ticket is a real user story.

**Splitting between two people:** the natural line is backend and frontend. Person A takes the `[BE]` tickets, Person B takes `[FE]`. Both pair on Epic 0 and Epic 1 — the setup and auth foundations are worth having two heads on, and after that the two tracks run mostly in parallel.

**Definition of done** (applies to every ticket):
- Works as described in the acceptance criteria
- Errors handled — no unhandled promise rejections, no white screen
- Works at 375px wide (frontend tickets)
- No secrets committed
- Reviewed and merged to `main`
- Deployed and confirmed working on the live URL

---

# Epic 0 — Foundations
**Days 1–2 · 4 tickets**

### CMS-01 [BE] — Repository and Express skeleton
**Task:** Set up the backend repository with the agreed folder structure and a health check endpoint.

**Acceptance criteria**
- [ ] Repo created, `main` branch protected
- [ ] Folder structure exists: `routes/`, `controllers/`, `services/`, `middleware/`
- [ ] `GET /health` returns `{ "data": { "status": "ok" } }`
- [ ] ESLint and Prettier configured, `npm run lint` passes
- [ ] `.env` gitignored, `.env.example` committed with every key listed
- [ ] Central error handler middleware in place, even if nothing throws yet
- [ ] `npm run dev` starts the server with hot reload

**Notes:** Build the error handler now, not later. Every ticket after this one assumes it exists.

---

### CMS-02 [FE] — React app skeleton
**Task:** Set up the frontend repository with routing, Tailwind, and a shared layout.

**Acceptance criteria**
- [ ] Vite + React app created (not Create React App)
- [ ] Tailwind configured and verified with a styled element
- [ ] React Router set up with placeholder pages for every route in PRD §9
- [ ] Shared layout: header with nav, main content area
- [ ] Axios instance configured with `baseURL` and `withCredentials: true`
- [ ] `.env` gitignored, `.env.example` committed
- [ ] `npm run dev` runs, `npm run build` succeeds

**Notes:** `withCredentials: true` on the axios instance now saves a confusing debugging session on day 4.

---

### CMS-03 [BE] — Database schema and migrations
**Task:** Create all four tables as committed migration files.

**Acceptance criteria**
- [ ] Supabase project created
- [ ] Supabase CLI installed and linked to the project
- [ ] Migration file creates `profiles`, `courses`, `lessons`, `enrollments` per PRD §6
- [ ] All foreign keys have `on delete cascade`
- [ ] Unique constraints on `lessons(course_id, position)` and `enrollments(course_id, student_id)`
- [ ] Indexes on `courses(instructor_id)`, `lessons(course_id)`, `enrollments(student_id)`
- [ ] Migration file committed to the repo
- [ ] Migration runs clean on a fresh database

**Notes:** Do not click tables into existence in the dashboard. The whole point is that the schema lives in git and can be recreated from scratch.

**Depends on:** CMS-01

---

### CMS-04 — Deploy to production
**Task:** Get both apps live on real URLs while they are still empty.

**Acceptance criteria**
- [ ] Backend deployed to Render or Railway, `/health` returns 200 on the live URL
- [ ] Frontend deployed to Vercel, loads on the live URL
- [ ] Environment variables set in both hosting dashboards
- [ ] CORS configured on the backend with the real frontend origin and `credentials: true`
- [ ] Frontend can successfully call the deployed `/health` endpoint
- [ ] Pushing to `main` triggers a redeploy on both

**Notes:** This is the most important ticket in the project and the one most likely to get postponed. Do not postpone it. Debugging a deploy is far easier when the app does nothing yet, and every ticket afterwards ships to a real URL instead of piling up locally.

**Depends on:** CMS-01, CMS-02

---

# Epic 1 — Authentication backend
**Day 3 · 4 tickets**

### CMS-05 [BE] — Register endpoint
**Story:** As a new user, I want to create an account with my email, password, and name, so that I can access the platform.

**Acceptance criteria**
- [ ] `POST /api/auth/register` accepts email, password, full name
- [ ] Zod validation: valid email, password at least 8 characters, name not empty
- [ ] Creates the Supabase auth user, then the matching `profiles` row with role `student`
- [ ] If the profile insert fails, the auth user is not left orphaned
- [ ] Duplicate email returns 409 with a clear message
- [ ] Validation failure returns 400 listing which fields failed
- [ ] Success returns 201 with the user object and sets both cookies

**Notes:** The orphaned-account case is the interesting part of this ticket. Two writes need to succeed or fail together — either use a Postgres trigger on `auth.users` to create the profile automatically, or delete the auth user if the profile insert throws. Worth discussing as a team before coding.

**Depends on:** CMS-03

---

### CMS-06 [BE] — Login, logout, and cookies
**Story:** As a registered user, I want to log in and out, so that I can start and end my session securely.

**Acceptance criteria**
- [ ] `POST /api/auth/login` accepts email and password
- [ ] Sets `access_token` and `refresh_token` cookies with `httpOnly`, `secure`, `sameSite: 'none'`
- [ ] Wrong password and unknown email return the **same** generic 401 message
- [ ] `POST /api/auth/logout` clears both cookies and returns 200
- [ ] No token is ever returned in the response body

**Notes:** Identical errors for wrong-password and unknown-email is deliberate — different messages let an attacker discover which emails have accounts.

**Depends on:** CMS-05

---

### CMS-07 [BE] — Auth middleware
**Story:** As the system, I want to identify the user on every protected request, so that I can enforce permissions.

**Acceptance criteria**
- [ ] `requireAuth` middleware reads the `access_token` cookie
- [ ] Verifies the token signature **locally** — no network call to Supabase per request
- [ ] Attaches `req.user` with id, email, and role
- [ ] Role is read from the `profiles` table, not trusted from a token claim
- [ ] Missing token returns 401 with code `NO_TOKEN`
- [ ] Expired token returns 401 with code `TOKEN_EXPIRED`
- [ ] `requireRole('instructor')` middleware returns 403 for the wrong role
- [ ] `GET /api/auth/me` returns the current user

**Notes:** `TOKEN_EXPIRED` needs to be distinguishable from `NO_TOKEN` — the frontend interceptor in CMS-10 uses that difference to decide whether to attempt a refresh or go straight to login. Check the Supabase dashboard for whether your project verifies via JWKS URL or a shared secret.

**Depends on:** CMS-06

---

### CMS-08 [BE] — Token refresh
**Story:** As a logged-in user, I want my session to continue without re-entering my password every hour.

**Acceptance criteria**
- [ ] `POST /api/auth/refresh` reads the refresh token cookie
- [ ] Exchanges it with Supabase for a new access token
- [ ] Sets the new `access_token` cookie
- [ ] Invalid or expired refresh token returns 401 and clears both cookies
- [ ] Endpoint works without a valid access token

**Depends on:** CMS-06

---

# Epic 2 — Authentication frontend
**Day 4 · 4 tickets**

### CMS-09 [FE] — Register and login pages
**Story:** As a visitor, I want forms to sign up and log in, so that I can get into the app.

**Acceptance criteria**
- [ ] `/register` form: email, password, full name
- [ ] `/login` form: email, password
- [ ] Client-side validation mirrors the server rules
- [ ] Submit button disabled and showing a spinner while the request is in flight
- [ ] API errors display above the form in readable language
- [ ] Success redirects to `/courses`
- [ ] Each page links to the other
- [ ] Enter key submits

**Depends on:** CMS-05, CMS-06

---

### CMS-10 [FE] — Auth context and refresh interceptor
**Story:** As a logged-in user, I want the app to remember me across page refreshes and handle expiry silently.

**Acceptance criteria**
- [ ] Auth context provides `user`, `loading`, `login()`, `logout()`
- [ ] On app load, calls `/api/auth/me` to restore the session
- [ ] A loading state shows until that call resolves — no flash of the login page
- [ ] Axios response interceptor: on a 401, calls `/api/auth/refresh` once and retries the original request
- [ ] If the refresh also fails, clears the user and redirects to login
- [ ] Concurrent 401s do not trigger multiple simultaneous refresh calls

**Notes:** The hardest ticket in Epic 2, and worth pairing on. Write it once and every feature afterwards gets session handling for free. The concurrent-401 case is real — a page loading three requests at once will fire three refreshes without a guard.

**Depends on:** CMS-08, CMS-09

---

### CMS-11 [FE] — Protected routes
**Story:** As the system, I want to keep users out of pages they should not see.

**Acceptance criteria**
- [ ] `<ProtectedRoute>` redirects logged-out users to `/login`
- [ ] After logging in, the user lands on the page they originally requested
- [ ] `<InstructorRoute>` shows a 403 page for students
- [ ] No page flicker while the session is being restored

**Notes:** This is a UX convenience, not a security control. The API enforces access independently, and it must — a determined user can bypass anything the browser does.

**Depends on:** CMS-10

---

### CMS-12 [FE] — Header and logout
**Story:** As a logged-in user, I want to see who I am logged in as and be able to log out.

**Acceptance criteria**
- [ ] Header shows the user's name when logged in
- [ ] Nav links differ by role — instructors see a Dashboard link
- [ ] Logout button calls the API, clears context, redirects to login
- [ ] Logged-out visitors see only Login and Register

**Depends on:** CMS-10

---

# Epic 3 — Courses backend
**Day 5 · 3 tickets**

### CMS-13 [BE] — Create and list courses
**Story:** As an instructor, I want to create courses and see the ones I own.

**Acceptance criteria**
- [ ] `POST /api/courses` requires the instructor role
- [ ] Zod validation: title 5–120 chars, description required
- [ ] `instructor_id` is taken from `req.user`, never from the request body
- [ ] `GET /api/courses` returns all courses for any logged-in user
- [ ] `GET /api/courses/mine` returns only the caller's courses
- [ ] Both list endpoints include the instructor's name and a lesson count
- [ ] Students calling `POST` get 403

**Notes:** Taking `instructor_id` from the session rather than the body is the security point of this ticket. If it comes from the body, any instructor can create a course owned by someone else.

**Depends on:** CMS-07

---

### CMS-14 [BE] — Course detail, update, delete
**Story:** As an instructor, I want to edit and delete my own courses — and only mine.

**Acceptance criteria**
- [ ] `GET /api/courses/:id` returns the course with its lessons, for any logged-in user
- [ ] `PATCH /api/courses/:id` updates title and description
- [ ] `DELETE /api/courses/:id` removes the course
- [ ] Both write endpoints return 403 if the caller is not the owner
- [ ] Unknown id returns 404, not 500
- [ ] Delete cascades to lessons and enrollments

**Notes:** Write the ownership check as reusable middleware — Epic 5 needs the same logic for lessons.

**Depends on:** CMS-13

---

### CMS-15 [BE] — Ownership middleware
**Story:** As the system, I want one reusable way to confirm a user owns the resource they are modifying.

**Acceptance criteria**
- [ ] Middleware loads the resource and compares its `instructor_id` to `req.user.id`
- [ ] Returns 404 for a missing resource, 403 for a wrong owner
- [ ] Attaches the loaded resource to `req` so the controller does not query again
- [ ] Works for both courses and lessons (lessons resolve ownership through their course)

**Notes:** Distinguishing 404 from 403 is a genuine design question worth a team discussion — returning 404 for resources you do not own hides their existence, which is arguably more secure. Either answer is defensible; pick one and be consistent.

**Depends on:** CMS-14

---

# Epic 4 — Courses frontend
**Day 6 · 3 tickets**

### CMS-16 [FE] — Instructor dashboard
**Story:** As an instructor, I want to see all my courses in one place.

**Acceptance criteria**
- [ ] `/instructor` lists my courses in a table or card grid
- [ ] Each row shows title, lesson count, enrolled-student count
- [ ] Each row links to its edit page
- [ ] "New course" button links to `/instructor/courses/new`
- [ ] Empty state: "No courses yet — create your first one"
- [ ] Loading skeleton while fetching

**Depends on:** CMS-13, CMS-11

---

### CMS-17 [FE] — Create and edit course forms
**Story:** As an instructor, I want to write and revise my course details.

**Acceptance criteria**
- [ ] `/instructor/courses/new` form: title, description
- [ ] `/instructor/courses/:id/edit` loads existing values
- [ ] Inline validation errors under each field
- [ ] Submit disabled while saving
- [ ] Success redirects to the edit page with a confirmation
- [ ] Server errors display without losing what the user typed

**Notes:** Preserving form state on a failed submit is easy to forget and infuriating to hit as a user.

**Depends on:** CMS-14, CMS-16

---

### CMS-18 [FE] — Delete course
**Story:** As an instructor, I want to delete a course I no longer need, without doing it by accident.

**Acceptance criteria**
- [ ] Delete button on the edit page
- [ ] Confirmation dialog naming the course and warning that lessons and enrollments go too
- [ ] Cancel closes with nothing deleted
- [ ] Confirm deletes and redirects to the dashboard
- [ ] Failure shows an error and leaves the user where they were

**Depends on:** CMS-14, CMS-17

---

# Epic 5 — Lessons
**Day 7 · 4 tickets**

### CMS-19 [BE] — Create and list lessons
**Story:** As an instructor, I want to add lessons to my course.

**Acceptance criteria**
- [ ] `POST /api/courses/:id/lessons` requires course ownership
- [ ] Fields: title (required), markdown content, optional video URL
- [ ] `position` is assigned automatically as the current lesson count plus one
- [ ] Video URL validated as a URL if present
- [ ] Lessons return in `position` order
- [ ] Non-owners get 403

**Depends on:** CMS-15

---

### CMS-20 [BE] — Lesson detail, update, delete
**Story:** As an enrolled student, I want to read a lesson — and as an instructor, to revise it.

**Acceptance criteria**
- [ ] `GET /api/lessons/:id` allowed for enrolled students and the course owner only
- [ ] Everyone else gets 403
- [ ] Response includes the lesson plus the full lesson list of its course, for sidebar navigation
- [ ] `PATCH` and `DELETE` restricted to the owner
- [ ] Deleting a lesson leaves the remaining positions contiguous

**Notes:** The gap-in-positions problem after a delete is worth handling now rather than discovering later. Either renumber on delete, or stop relying on positions being contiguous.

**Depends on:** CMS-19

---

### CMS-21 [FE] — Lesson management UI
**Story:** As an instructor, I want to add and edit lessons from my course edit page.

**Acceptance criteria**
- [ ] Lesson list on the course edit page, in order
- [ ] "Add lesson" opens a form: title, markdown content, video URL
- [ ] Markdown textarea with a live preview, or a preview toggle
- [ ] Each lesson has edit and delete controls
- [ ] Delete asks for confirmation
- [ ] Empty state: "No lessons yet — add your first one"

**Depends on:** CMS-19, CMS-20, CMS-17

---

### CMS-22 [FE] — Markdown rendering
**Story:** As a student, I want lesson content to display as formatted text rather than raw markup.

**Acceptance criteria**
- [ ] `react-markdown` renders lesson content
- [ ] Headings, lists, links, bold, italic, code blocks all styled with Tailwind
- [ ] Links open in a new tab
- [ ] Raw HTML in markdown is **not** rendered
- [ ] Long content and long code blocks do not break the layout on mobile

**Notes:** Leaving raw HTML disabled is the security-relevant line here — rendering it would let any instructor inject scripts into a student's browser.

**Depends on:** CMS-21

---

# Epic 6 — Student experience
**Day 8 · 5 tickets**

### CMS-23 [BE] — Enroll and unenroll
**Story:** As a student, I want to join a course and leave it if I change my mind.

**Acceptance criteria**
- [ ] `POST /api/courses/:id/enroll` creates an enrollment for `req.user`
- [ ] Duplicate enrollment returns 409 — enforced by the database unique constraint, not an application check
- [ ] An instructor enrolling in their own course gets 400
- [ ] `GET /api/enrollments/mine` returns my enrollments with course details
- [ ] `DELETE /api/enrollments/:id` deletes only the caller's own enrollment
- [ ] Deleting someone else's returns 403

**Notes:** Let the unique constraint do the work and catch the database error. A "check then insert" is a race condition — two fast clicks can both pass the check.

**Depends on:** CMS-15

---

### CMS-24 [FE] — Course catalog
**Story:** As a logged-in user, I want to browse the available courses.

**Acceptance criteria**
- [ ] `/courses` shows a responsive card grid
- [ ] Each card: title, instructor name, lesson count, truncated description
- [ ] Cards link to the detail page
- [ ] Loading skeletons while fetching
- [ ] Empty state when no courses exist
- [ ] One column on mobile, two or three on desktop

**Depends on:** CMS-13, CMS-11

---

### CMS-25 [FE] — Course detail page
**Story:** As a student, I want to see what a course covers before I enroll.

**Acceptance criteria**
- [ ] `/courses/:id` shows title, description, instructor, lesson list
- [ ] Not enrolled: lesson titles visible, not clickable, with an Enroll button
- [ ] Enrolled: lessons clickable, with a "Continue" button to the first lesson
- [ ] Own course as instructor: an "Edit course" link instead of Enroll
- [ ] Enrolling updates the page without a full reload

**Depends on:** CMS-23, CMS-24

---

### CMS-26 [FE] — My courses
**Story:** As a student, I want a list of the courses I have joined.

**Acceptance criteria**
- [ ] `/my-courses` lists enrolled courses
- [ ] Each entry links into the course
- [ ] Unenroll button with a confirmation dialog
- [ ] Unenrolling removes the entry without a page reload
- [ ] Empty state links to the catalog

**Depends on:** CMS-23

---

### CMS-27 [FE] — Lesson viewer
**Story:** As an enrolled student, I want to read lessons and move through them in order.

**Acceptance criteria**
- [ ] `/learn/:courseId/:lessonId` shows the rendered lesson content
- [ ] Sidebar lists every lesson in the course, current one highlighted
- [ ] Previous and Next buttons, disabled at the ends
- [ ] Embedded video player when a video URL is present
- [ ] Sidebar collapses into a drawer on mobile
- [ ] A non-enrolled user hitting the URL directly is redirected to the course detail page

**Notes:** The direct-URL case matters. Hiding the link is not access control — the API check from CMS-20 is what actually enforces this.

**Depends on:** CMS-20, CMS-22, CMS-25

---

# Epic 7 — Polish and ship
**Days 9–10 · 4 tickets**

### CMS-28 [FE] — Error and empty states
**Story:** As a user, I want to understand what went wrong instead of staring at a blank screen.

**Acceptance criteria**
- [ ] Every page handles loading, error, and empty states
- [ ] Failed requests show a readable message with a retry option
- [ ] A React error boundary catches render crashes
- [ ] 404 page for unknown routes
- [ ] 403 page for permission failures
- [ ] No raw error objects or stack traces reach the user

---

### CMS-29 [FE] — Responsive pass
**Story:** As a mobile user, I want the app to be usable on my phone.

**Acceptance criteria**
- [ ] Every page checked at 375px, 768px, and 1280px
- [ ] No horizontal scroll at any width
- [ ] Nav collapses to a mobile menu
- [ ] Tap targets at least 44px
- [ ] Forms usable on a phone keyboard
- [ ] Tables scroll or reflow rather than overflow

---

### CMS-30 — Security review
**Story:** As the team, we want to confirm we have not left anything obviously open.

**Acceptance criteria**
- [ ] No Supabase service key anywhere in frontend code or the built bundle
- [ ] Every write endpoint verified for auth and ownership — test by calling them directly with a wrong user's session
- [ ] CORS restricted to the real frontend origin, not `*`
- [ ] Rate limiting on `/api/auth/login` and `/api/auth/register`
- [ ] No secrets in git history
- [ ] Server errors do not leak stack traces in production

**Notes:** Do the direct-API testing with curl or Postman rather than through the UI. Testing through the UI only proves the UI hides the button.

---

### CMS-31 — Final deploy and walkthrough
**Story:** As the team, we want a working deployed app and a shared understanding of how it was built.

**Acceptance criteria**
- [ ] All work merged to `main` and deployed
- [ ] Smoke test on the live URL: register, log in, create a course, add lessons, enroll from a second account, read a lesson, unenroll
- [ ] README covers local setup, env vars, and how to deploy
- [ ] Team walkthrough: each person explains a part they did not write
- [ ] Retro notes: what to keep, what to change next project

**Notes:** Explaining code you did not write is the single best test of whether the training worked. Assign the pairings in advance so people read the other half of the codebase.

---

## Summary

| Epic | Days | Tickets |
|---|---|---|
| 0 — Foundations | 1–2 | CMS-01 … CMS-04 |
| 1 — Auth backend | 3 | CMS-05 … CMS-08 |
| 2 — Auth frontend | 4 | CMS-09 … CMS-12 |
| 3 — Courses backend | 5 | CMS-13 … CMS-15 |
| 4 — Courses frontend | 6 | CMS-16 … CMS-18 |
| 5 — Lessons | 7 | CMS-19 … CMS-22 |
| 6 — Student experience | 8 | CMS-23 … CMS-27 |
| 7 — Polish and ship | 9–10 | CMS-28 … CMS-31 |

**Critical path:** CMS-01 → CMS-03 → CMS-05 → CMS-07 → CMS-13 → CMS-19 → CMS-23. If any of these slip, everything behind them slips.

**Safe to cut if you fall behind:** CMS-18 (delete course), CMS-26 (my courses page), lesson reordering. Cutting CMS-30 is a false economy — it is the ticket that catches the mistakes worth learning from.
