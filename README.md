# Nexus — Full‑Stack App (React + Node + MongoDB + Socket.IO + Stripe)

A production‑ready, full‑stack web app powering the **Nexus platform**.

Frontend: **Vite + React + TypeScript + TailwindCSS**
Backend: **Express + MongoDB (Mongoose) + JWT + Socket.IO + Stripe**

---

## ✨ Features

### 🔐 Authentication & Security

* Email/password auth with JWT access & refresh tokens
* Optional **Two‑Factor Authentication (OTP via email)**
* Sanitization, XSS prevention, Helmet, and rate‑limiting
* Role support: **entrepreneur** and **investor**

### 🤝 Collaboration

* **Meetings**: create, list, accept/decline
* **Messaging**
* **Video calls** with WebRTC (signaling over Socket.IO)

### 📑 Documents

* Upload, list, download, share
* **E‑sign documents** (demo)

### 💳 Payments

* Balance, deposit, transfer, withdraw
* **Stripe integration** + webhook handler

### 🛠 Developer Experience

* Vite HMR, TypeScript, ESLint, TailwindCSS
* Clear modular structure (client + server)

---

## 🧱 Tech Stack

**Frontend:** React 18, Vite 5, TypeScript, TailwindCSS, React Router, react-hot-toast, Stripe.js
**Backend:** Node.js, Express, Mongoose, Socket.IO, JWT, Stripe
**Infra:** Environment variables via `.env`, CORS allow‑list, static uploads

---

## 🗂️ Monorepo Structure

```
nexus-main/
├─ .env                          # Frontend env (Stripe publishable key, etc.)
├─ index.html
├─ package.json                  # Frontend scripts & deps
├─ vite.config.ts
├─ tailwind.config.js
├─ postcss.config.js
├─ src/                          # React app
│  ├─ main.tsx                   # Stripe Elements + App bootstrap
│  ├─ App.tsx                    # Routes & providers
│  ├─ config/api.ts              # API_BASE_URL & SOCKET_URL
│  ├─ context/                   # Auth, Password, VideoCall contexts
│  ├─ components/                # UI, Payments, Meetings, Documents, Video...
│  └─ pages/                     # Auth, Dashboards, Profile, Payments, Video...
│
└─ server/
   ├─ .env                       # Backend env (NEVER commit real secrets)
   ├─ package.json               # Backend scripts & deps
   └─ src/
      ├─ index.js                # Express app, Socket.IO, webhook raw body
      ├─ config/db.js            # Mongo connection (MONGO_URI)
      ├─ middleware/             # auth, security, validation, upload
      ├─ controllers/            # auth, profile, payments, etc.
      ├─ models/                 # User, Meeting, Document, Transaction
      ├─ routes/                 # auth, users, profile, meetings, documents, payments, videoCalls
      ├─ services/               # jwtService, passwordService, twoFactorAuth
      └─ utils/                  # helper scripts
```

---

## 🚀 Quick Start (Dev)

### 0) Prerequisites

* Node.js 18+
* MongoDB (local or Atlas)
* Stripe account + CLI (for webhooks)

### 1) Clone

```bash
git clone https://github.com/<your-username>/nexus-main.git
cd nexus-main
```

### 2) Install dependencies

```bash
# frontend (root)
npm install

# backend
cd server && npm install && cd ..
```

### 3) Configure Environment

**Frontend: `./.env`**

```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_********************************
```

Set backend URLs in `src/config/api.ts`:

```ts
export const API_BASE_URL = 'http://localhost:5000';
export const API_URL = `${API_BASE_URL}/api`;
export const SOCKET_URL = API_BASE_URL;
```

**Backend: `./server/.env`**

```bash
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority

JWT_SECRET=your_access_jwt_secret
JWT_REFRESH_SECRET=your_refresh_jwt_secret

STRIPE_SECRET_KEY=sk_test_********************************
STRIPE_PUBLISHABLE_KEY=pk_test_********************************
STRIPE_WEBHOOK_SECRET=whsec_********************************
```

> ⚠️ Replace all placeholder values with your own. Never commit real secrets.

### 4) Run the stack

Terminal A – backend:

```bash
cd server
npm run dev
# http://localhost:5000
```

Terminal B – frontend:

```bash
npm run dev
# http://localhost:5173
```

### 5) (Optional) Stripe Webhook

```bash
stripe listen --forward-to http://localhost:5000/api/payments/webhook/stripe
```

Set the output `STRIPE_WEBHOOK_SECRET` in `server/.env`.

---

## 🔐 Auth & 2FA Flow

* **Register** → `POST /api/auth/signup`
* **Login** → `POST /api/auth/login` → returns `accessToken` & `refreshToken`
* **Me** → `GET /api/auth/me`
* **2FA** → enable/verify via OTP (email)
* **Logout** → `POST /api/auth/logout`

Local storage keys:

```
business_nexus_user
business_nexus_token
business_nexus_reset_token
```

---

## 🔌 Socket.IO (Video Calls)

**Client → Server:**

* `join-room`, `offer`, `answer`, `ice-candidate`
* `toggle-audio`, `toggle-video`, `leave-room`

**Server → Clients:**

* `user-connected`, `user-disconnected`
* `offer`, `answer`, `ice-candidate`
* `user-audio-toggled`, `user-video-toggled`

---

## 🧭 API Overview

### Auth

`/api/auth/*` → signup, login, refresh, me, logout, 2FA

### Profile

`/api/profile` → get/update profile

### Users

CRUD/list endpoints

### Meetings

`/api/meetings` → create, list, update, accept/decline

### Documents

* Upload: `POST /api/documents/upload`
* List: `GET /api/documents`
* Download: `GET /api/documents/:id/download`
* Share/Sign: `POST /api/documents/:id/share`, `POST /api/documents/:id/sign`

### Payments

* Webhook: `POST /api/payments/webhook/stripe`
* Deposit/Withdraw/Transfer
* Transactions listing

### Video Calls

Room creation, listing, participation queries

---

## 🧪 Quick cURL Examples

```bash
# Sign up
curl -X POST http://localhost:5000/api/auth/signup   -H "Content-Type: application/json"   -d '{"firstName":"Ada","lastName":"Lovelace","email":"ada@example.com","password":"S3cure!Pass","userType":"entrepreneur"}'

# Login
curl -X POST http://localhost:5000/api/auth/login   -H "Content-Type: application/json"   -d '{"email":"ada@example.com","password":"S3cure!Pass","userType":"entrepreneur"}'

# Me
curl http://localhost:5000/api/auth/me -H "Authorization: Bearer TOKEN"
```

---

## 🛡️ Security Notes

* Update CORS allow‑list in `server/src/middleware/security.js`
* Use **strong JWT secrets** and rotate refresh tokens
* Replace dev email (Ethereal) with real SMTP for 2FA
* Configure Stripe webhook correctly (raw body required)
* Never commit real secrets → use `.env` + `.env.example`

---

## 🧰 Available Scripts

**Frontend (root):**

```bash
npm run dev       # start Vite dev server
npm run build     # production build
npm run preview   # preview build
npm run lint      # lint
```

**Backend (server/):**

```bash
npm run dev       # start with nodemon
npm run start     # start with node
```

---

## 🐛 Troubleshooting

* **MongoDB error** → check `MONGO_URI` + Atlas IP allow‑list
* **Stripe signature error** → ensure webhook secret matches
* **CORS error** → add `http://localhost:5173` to allowed origins
* **Socket.IO error** → ensure `SOCKET_URL` in frontend points to backend

---

## 📜 License

Released under the **ISC license** (see `server/package.json`).
You may relicense the project to MIT or another license if preferred.
