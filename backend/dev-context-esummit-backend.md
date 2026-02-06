eSummit CGC Mohali – Backend Dev Context (Internal Notes)
=========================================================

Purpose
-------
- **Audience**: Assistant (internal only, to guide future coding steps).
- **Goal**: Keep a single, consistent source of truth so all code aligns with the agreed MVP architecture, flows, and constraints.
- **Scope**: Backend-only (Node.js/Express + Supabase + Razorpay + Vercel). Frontend is a separate consumer via REST + optional realtime.

High-Level Product Intent
-------------------------
- **Event**: eSummit CGC Mohali (venue: CGC Landran, date: starts 2026-02-11 10:00 IST).
- **Core user journey**:
  1. Register / Login (email+password through Supabase Auth).
  2. Complete / view profile (name, phone, org, year).
  3. View event details and passes (Gold/Silver/Platinum/Priority).
  4. Purchase a pass via Razorpay (test mode).
  5. Use dashboard to see countdown and their purchased passes (plus realtime status updates).
- **Non-goals for MVP**: Admin panel, refunds, merch, advanced analytics, complex role systems.

Architecture & Stack
--------------------
- **Runtime**: Node.js 20, Express.
- **DB/Auth/Realtimes**: Supabase Free:
  - Auth (email confirmation OFF for MVP).
  - Postgres DB with RLS.
  - Realtime (for subscriptions, possibly used instead of custom Socket.io on Vercel).
  - Storage: public bucket `event-images` (not central to backend logic for now).
- **Payments**: Razorpay, test mode only.
- **Hosting**: Vercel (Hobby) for the Node/Express backend (serverless env).
- **Key libraries**:
  - `express`, `cors`, `helmet`, `express-rate-limit`.
  - `@supabase/supabase-js` (client-side SDK, but used here from Node).
  - `razorpay` (for server-side order creation).
  - `joi` for validation.
  - `socket.io` for optional realtime (but Supabase Realtime may be preferred to stay within Vercel constraints).
  - Dev tools: `nodemon`, `jest`, `dotenv`, Supabase CLI, optionally Prisma just for typed models (not required).

Project Layout (Backend)
------------------------
- Root: `backend/`
  - `src/controllers/` – Express handlers for each route.
  - `src/middleware/` – Auth, validation, rate limiting, error handling.
  - `src/routes/` – Express routers grouped by domain (auth, profile, events, passes, orders, dashboard, misc).
  - `src/services/` – Supabase access wrappers, Razorpay integration, business logic helpers (e.g., buy flow).
  - `src/utils/` – Validation schemas, date/time helpers, cron helpers, error helpers.
  - `src/realtime/` – Socket.io or realtime-channel handlers (if we use custom realtime).
  - `supabase/` – SQL migrations, Edge functions (notably `razorpay-webhook`).
  - `vercel.json` – Vercel config (rewrites, crons).
  - `.env` (local only) – Supabase URLs/keys, Razorpay keys, environment flags.

Database & Schema (Supabase)
----------------------------
- **Tables**:
  - `profiles`:
    - `id UUID PK` – references `auth.users(id)` (1:1 with Supabase Auth user).
    - `name TEXT NOT NULL`.
    - `email TEXT UNIQUE` (mirror of Auth; convenience).
    - `phone TEXT`.
    - `org TEXT`.
    - `year INTEGER` – academic year (e.g., 2024).
    - `created_at TIMESTAMP DEFAULT NOW()`.
  - `events`:
    - `id SERIAL PK`.
    - `name TEXT NOT NULL` (e.g., "eSummit CGC Mohali").
    - `description TEXT`.
    - `start_date TIMESTAMP` – important for countdown computations.
    - `venue TEXT`.
    - `is_active BOOLEAN DEFAULT true`.
  - `passes`:
    - `id SERIAL PK`.
    - `type TEXT NOT NULL UNIQUE` – "Gold", "Silver", "Platinum", "Priority".
    - `price INTEGER NOT NULL` – amount in INR (not paise).
    - `stock INTEGER DEFAULT 100`.
    - `perks TEXT[]` – list of perks (or JSON, but for now text[]).
    - `row_version INTEGER DEFAULT 0` – used for optimistic locking / stock control.
  - `orders`:
    - `id UUID PK DEFAULT gen_random_uuid()`.
    - `user_id UUID REFERENCES profiles(id)`.
    - `pass_id INTEGER REFERENCES passes(id)`.
    - `razorpay_payment_id TEXT`.
    - `status TEXT DEFAULT 'pending'` – `pending` | `success` | `failed`.
    - `created_at TIMESTAMP DEFAULT NOW()`.

- **RLS**:
  - `profiles`:
    - Enabled row level security.
    - Policy: "Users own profile" – `USING (auth.uid() = id)` for all operations (MVP).
  - `orders`:
    - RLS should ensure users can read only their own orders (read-only owner policy).
  - Public data like `events` and `passes` can remain accessible via the anon key without strict RLS per-user (but RLS can still be enabled with permissive policies).

- **Indexes**:
  - `orders`: `idx_orders_user_status ON orders(user_id, status)`.
  - `passes`: `idx_passes_stock ON passes(stock)`.

- **Seed data (MVP)**:
  - One `events` entry:
    - `id = 1`, `name = "eSummit CGC Mohali"`.
    - `start_date = "2026-02-11 10:00:00+05:30"` (IST).
    - `venue = "CGC Landran"`.
    - `is_active = true`.
  - `passes`:
    - Gold: `id=1`, `price=5000`, `stock=50`.
    - Silver: `price=3000`, `stock=100`.
    - Platinum: `price=10000`, `stock=20`.
    - Priority: `price=2000`, `stock=200`.

Core API Surface
----------------
- Base path (likely): `/api`.

- **Auth**:
  - `POST /register` – No auth.
    - Body: `{ email, password, name, phone?, org?, year? }`.
    - Flow:
      - `supabase.auth.signUp({ email, password })`.
      - On success, insert into `profiles` with `id = user.id` and provided info.
      - Return `{ user, session }` or at least `{ access_token, user }`.
      - Handle "email already exists" with HTTP 409.
  - `POST /login` – No auth.
    - Body: `{ email, password }`.
    - Flow: `supabase.auth.signInWithPassword`.
    - Return `{ user, session }` (especially `access_token` for frontend).

- **Profile**:
  - `GET /profile` – Auth required.
    - Uses Supabase auth token from `Authorization: Bearer <access_token>`.
    - Fetch `profiles` row where `id = user.id`.
  - `PUT /profile` – Auth required.
    - Body: subset of profile fields.
    - Upsert row in `profiles` with `id = user.id`.

- **Events**:
  - `GET /events` – Public.
    - Return all active events (filter `is_active = true`).
  - `GET /events/:id` – Public.
    - Return single event and computed countdown:
      - `countdown_ms = max(0, event.start_date - now())` (careful with timezone).

- **Passes**:
  - `GET /passes` – Public.
    - Return pass list `{id, type, price, stock, perks}`.

- **Orders**:
  - `GET /orders` – Auth required.
    - Return orders for `user.id`, ideally joined with `passes` to include pass type and price.

- **Purchase / Buy**:
  - `POST /passes/:id/buy` – Auth required.
    - Body (validated): `{ expected_amount, version? }` (and/or additional fields).
    - Flow:
      1. Supabase RPC `check_stock(pass_id, version)` for optimistic locking stock check.
      2. If OK, use Razorpay SDK:
         - `razorpay.orders.create({ amount: expected_amount * 100, currency: 'INR', receipt: <order_id> })`.
      3. Insert into `orders` with `status = 'pending'`, `user_id = user.id`, `pass_id = ...`, `razorpay_payment_id = razorpay_order.id`.
      4. Return `{ razorpay_order: {...} }` for frontend to open Razorpay checkout.

- **Dashboard**:
  - `GET /dashboard` – Auth required.
    - In parallel:
      - Profile.
      - Active events.
      - User orders joined with passes.
    - Compute countdown for the main/next active event.
    - Payload: `{ profile, events, my_passes, countdown_ms }`.

Middleware & Cross-Cutting Concerns
-----------------------------------
- **authMiddleware**:
  - Reads `Authorization` header (`Bearer <token>`).
  - Uses `supabase.auth.getUser(token)` or equivalent server-side verification.
  - On success: attaches `req.user` with at least `{ id, email }`.
  - On failure: respond 401.

- **validateJoi**:
  - Takes a Joi schema and validates `req.body` (and possibly `req.params`).
  - On validation error: respond 400 with details.

- **rateLimit**:
  - Global rate limit: ~100 requests/min per IP (MVP baseline).
  - Might have a slightly higher limit or separate window for specific endpoints (e.g., /health, /events).

- **helmet**:
  - Standard security headers; ensure compatibility with Vercel/any proxies.

- **errorHandler**:
  - Catch async errors and send normalized JSON response: `{ error: string, code?: string }`.
  - Log errors to console (relying on Vercel logs).

Payments & Webhooks (Razorpay)
------------------------------
- **Razorpay server-side use**:
  - Use test keys from env: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`.
  - Create orders only from the backend.

- **Webhook (Supabase Edge Function: `razorpay-webhook`)**:
  - Exposed as a HTTP endpoint (Supabase Function URL).
  - Logic:
    1. Read headers/body from Razorpay.
    2. Verify signature via HMAC (Node `crypto.createHmac('sha256', webhook_secret) ...`).
    3. If valid, identify the related order/payment:
       - Use `payment_id` / `order_id` to correlate with our `orders` table.
    4. Call an RPC `confirm_payment` or perform DB operations:
       - If success:
         - `UPDATE passes SET stock = stock - 1, row_version = row_version + 1 WHERE id = pass_id AND stock > 0;`
         - `UPDATE orders SET status = 'success' WHERE razorpay_payment_id = payment_id;`
       - If failure:
         - Update `orders.status = 'failed'`.
  - Must handle idempotency: re-sent webhooks should not double-decrement stock.

- **Connection from backend**:
  - Either:
    - Backend proxies `/api/webhook/razorpay` to Supabase function.
    - Or Razorpay directly calls Supabase Edge URL (backend mainly used for regular APIs).

Realtime Strategy
-----------------
- Primary option:
  - Use **Supabase Realtime** client-side (frontend subscribes to `orders` changes).
  - Backend does not need custom Socket.io server (simpler on Vercel).

- Alternative (if needed):
  - `socket.io` server integrated with Express server; join rooms like `user:${user.id}`.
  - On order updates (e.g., from webhook or internal operations), emit `order_update` to that room.
  - But must account for Vercel serverless limitations (long-lived WebSocket connections not ideal).

Non-Functional Requirements & Constraints
-----------------------------------------
- **Performance**:
  - Target: <200 ms API response time under normal load.
  - Support ~500 concurrent users on free tiers (Supabase + Vercel).

- **Reliability**:
  - Supabase free tier can pause on inactivity.
  - Use a daily cron (Vercel `crons` + a `/api/cron/ping` endpoint) to keep it warm:
    - Example: `INSERT INTO logs(ping) VALUES (NOW());` in Supabase, or a lightweight `SELECT 1`.

- **Security**:
  - RLS for user-specific tables (`profiles`, `orders`).
  - Strong auth checks in middleware (no trusting frontend input for user IDs).
  - Validate all inputs with Joi.
  - Helmet + rate limiting.
  - Never expose service role key to frontend.

Phased Roadmap (Summary for Myself)
-----------------------------------
- **Phase 1 – Supabase Setup**:
  - Create project, enable Auth/Realtime/Storage, run schema, seed data, stub `razorpay-webhook`, confirm RLS, note keys.
  - Key outcome: DB + Auth + Realtime ready, with initial event and passes.

- **Phase 2 – Backend Initialization**:
  - Init Node/Express project with structure & dependencies.
  - Implement core middleware, `.env.example`, `health` endpoint.
  - Key outcome: Local server up with clean baseline.

- **Phase 3 – Core APIs**:
  - Implement Auth, Profile, Events, Passes, Orders, Buy, Dashboard logic.
  - Add Joi schemas, route wiring, basic Jest tests for services.
  - Key outcome: End-to-end register → login → buy (pending) → dashboard flow works with test Razorpay orders.

- **Phase 4 – Integrations & Realtime**:
  - Finalize Razorpay integration & webhook flow.
  - Add cron ping endpoint.
  - Decide and implement realtime mechanism (likely Supabase Realtime only).
  - Key outcome: Payment confirmation updates stock/orders reliably; realtime updates visible.

- **Phase 5 – Deployment & Launch**:
  - Configure `vercel.json` rewrites + crons.
  - Set env vars on Vercel, deploy, wire webhooks.
  - Run post-deploy E2E checks, configure UptimeRobot, finalize README+API docs.
  - Key outcome: Production-ready MVP backend, docs handed off to frontend.

Testing & Monitoring Notes
--------------------------
- **Testing**:
  - Unit tests (Jest) around:
    - Auth middleware (token parsing).
    - Services for buy flow (mock Supabase + Razorpay).
    - Dashboard aggregator logic (correct countdown and data shape).
  - E2E (Postman/Newman):
    - Register → login → get profile → update profile → list events/passes → buy → simulate webhook → dashboard.
  - Load (Artillery):
    - 200 concurrent `GET /dashboard` and purchase simulations to confirm no overselling or 5xx spikes.

- **Monitoring**:
  - Vercel logs for API errors.
  - Supabase dashboard for DB usage and errors.
  - UptimeRobot (or similar) ping `GET /health` every few minutes.

Key Design Principles to Stick To
---------------------------------
- Keep endpoints **simple** and **RESTful**, minimal nesting.
- Rely on **Supabase Auth + RLS** for security; never trust client-sent IDs.
- Use **services** layer for all Supabase and Razorpay logic (controllers stay thin).
- Always **validate inputs** (Joi) and **normalize errors** via `errorHandler`.
- Prefer **Supabase Realtime** over custom Socket.io on Vercel to avoid infra friction.
- Stay within **free tier limits**; prioritize lean queries and minimal extra features.