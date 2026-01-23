# Project Audit Report

## 1. Project Overview

- **Name**: Refresh Breeze (JKT48 Fanbase Web App)
- **Tech Stack**: Node.js, Express, Supabase (PostgreSQL), Midtrans Payment Gateway.
- **Architecture**: MVC (Model-View-Controller) structure.
- **Demo Mode**: The backend has a built-in `isDemoMode` fallback if `.env` (JWT_SECRET) is missing, returning mock data.

## 2. Feature Completeness Matrix

| Module           | Feature             | Status         | Notes                                                     |
| :--------------- | :------------------ | :------------- | :-------------------------------------------------------- |
| **Auth**         | Register / Login    | ✅ Implemented | JWT + Bcrypt.                                             |
|                  | Password Reset      | ⚠️ Partial     | OTP stored in memory (RAM). Will fail if server restarts. |
| **Products**     | View Products       | ✅ Implemented | Consolidated endpoint `/api/products-and-stock`.          |
|                  | Manage Stock        | ✅ Implemented | Global `stok_cheki` setting in database.                  |
| **Transactions** | Checkout (Midtrans) | ✅ Implemented | Creation of Snap Token + Order Record.                    |
|                  | Webhook Handling    | ✅ Implemented | Automatic status update & stock reduction on payment.     |
| **Admin**        | Dashboard Stats     | ✅ Implemented | Users, Revenue, Stock, Items Sold.                        |
|                  | Manage Settings     | ✅ Implemented | Bulk update for prices, event info.                       |
|                  | Monthly Stats       | ❌ Placeholder | Endpoint exists but returns `0` hardcoded.                |
| **Members**      | CRUD                | ✅ Complete    | Create, Read, Update, Delete.                             |
| **News**         | CRUD                | ✅ Complete    | Create, Read, Update, Delete.                             |
| **Gallery**      | CRUD                | ✅ Complete    | Create, Read, Update, Delete.                             |
| **Events**       | Next Event (Public) | ✅ Implemented | Shows nearest future active event.                        |
|                  | Admin Management    | ⚠️ Partial     | Create & Read only. **Update/Delete missing.**            |
| **User**         | Profile Management  | ✅ Implemented | Update profile & password.                                |
|                  | Order History       | ✅ Implemented | View personal order history.                              |

## 3. API Endpoint Documentation

### Authentication (`/api`)

- `POST /register` - Register new user.
- `POST /login` - Login user (returns JWT).
- `POST /verify-and-generate-otp` - Request password reset OTP.
- `POST /reset-password-with-code` - Reset password using OTP.

### Public Data (`/api`)

- `GET /products-and-stock` - **Heavy Endpoint**. Returns Products, Settings (Stock), News (Top 3), Gallery.
- `GET /leaderboard` - Global top spenders.
- `GET /leaderboard-per-member?memberName=...` - Top spenders per member.
- `GET /public/gallery` - All active gallery images.
- `GET /public/next-event` - Next active event info.

### User (`/api/user` & `/api`)

- `GET /api/user/profile` - Get current user profile.
- `PUT /api/user/profile` - Update profile.
- `GET /api/my-orders` - Get personal order history.

### Orders & Payment (Root `/`)

- `GET /api/midtrans-client-key` - Get public client key.
- `POST /get-snap-token` - **Critical**. Create Midtrans transaction.
- `POST /update-order-status` - Midtrans Webhook handler.

### Admin (`/api/admin`) - Protected

- **Stats**: `/stats`, `/dashboard-stats`, `/all-users`.
- **Orders**: `/all-orders` (Implemented inline in routes), `/orders/:id` (Delete), `/undo-ticket-status`.
- **Settings**: `/settings` (Get/Put), `/set-cheki-stock`, `/update-cheki-stock`.
- **Resources**:
  - `GET/POST/PUT/DELETE /members`
  - `GET/POST/PUT/DELETE /news`
  - `GET/POST/PUT/DELETE /gallery`
  - `GET/POST /events` (**Note**: No PUT/DELETE for events).

## 4. Midtrans Integration Review

- **Configuration**: located in `config/midtrans.js`. Correctly checks `MIDTRANS_SERVER_KEY` and `clientKey`.
- **Flow**:
  1.  User requests token -> Server checks DB Stock.
  2.  If stock available -> Call Midtrans Snap API.
  3.  Create Pending Order in DB (`pesanan` table).
  4.  Frontend opens Snap Popup.
  5.  Payment Success -> Midtrans calls Webhook `/update-order-status`.
  6.  Server verifies status (`settlement`/`capture`) -> Updates Order to `berlaku` -> **Reduces Stock** in `pengaturan` table.
- **Race Condition Handling**: The code checks stock _before_ generating the token. However, strict atomic locking (database level) isn't fully visible, though `stockUtils` fetches the latest single row.

## 5. Code Quality & Issues

1.  **In-Memory OTP**: `authController.js` stores OTPs in a simple JavaScript simple `Map`. **Risk**: All pending password resets valid codes are lost if the server restarts (e.g., auto-deployment).
2.  **Inconsistent Route Logic**:
    - Most logic is in controllers.
    - `adminRoutes.js` contains a raw inline SQL query for `/all-orders` (Lines 20-33). This violates MVC separation.
3.  **Missing CRUD for Events**: `eventRoutes.js` only has `createEvent` and `getEvents`. There is no way to Edit or Delete an event via API.
4.  **Placeholder Code**: `adminRoutes.js` endpoint `/monthly-stats` is explicitly returned as `0`.
