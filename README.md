# 🍽️ MessConnect

[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-v5-blue.svg)](https://expressjs.com/)
[![React](https://img.shields.io/badge/React-v18-61dafb.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-v8-646cff.svg)](https://vitejs.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose_9-47A248.svg)](https://www.mongodb.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC.svg)](https://tailwindcss.com/)

**MessConnect** is a transparency-focused, multi-tenant platform designed to bridge the gap between students, mess vendors, mess committee faculty, and college administrators. Its mission is to improve accountability, food quality, hygiene standards, and communication within institutional dining systems.

---

## 🚀 Project Overview

MessConnect digitizes the entire institutional dining ecosystem. By replacing informal complaints and manual record-keeping with a centralized platform, MessConnect provides:

- **Geotagged Evidence & Image Viewer**: Photo evidence with location metadata for authentic feedback.
- **TrustMeter System**: Automated trust scoring and suspension mechanisms to eliminate spam while rewarding genuine feedback.
- **Multi-Role Dashboards**: Customized views and capabilities for Students, Mess Vendors, Mess Committee Members, College Admins, and Super Admins.
- **Timetable & Staff Directories**: Real-time weekly menu schedules and vendor staff management.
- **48-Hour Active Complaint Horizon**: Auto-filtering of resolved and rejected complaints after 48 hours to maintain dashboard clarity.

---

## 👥 User Roles & Features

### 🎓 Students
- **Weekly Mess Menu**: Access current meal schedules for Breakfast, Lunch, Snacks, and Dinner.
- **Geotagged Complaint Filing**: Submit complaints complete with photo evidence, categories, and location verification.
- **TrustMeter & Reliability Rating**:
  - Starts at **100% Trust**.
  - Decreases by **10 points** for invalid rejections (*spam, fake, inappropriate, unrelated*).
  - Triggers a **7-day suspension** if TrustMeter drops to **0%**, blocking new complaints with a live countdown display.
  - Features **lazy recovery** (restores baseline 20% after 7 days) and **gradual recovery** (+10 points for every genuinely resolved complaint, up to 100%).
- **Full-Screen Photo Viewer**: View full-resolution images of submitted complaints.
- **Daily Feedback**: Submit ratings and feedback for daily meal quality.

### 🧑‍🍳 Mess Vendors
- **Timetable Management**: Create, update, and publish 7-day weekly food timetables.
- **Staff Directory**: Register and manage mess staff (cooks, supervisors, helpers, cleaning staff).
- **Feedback & Rating Monitoring**: Review student feedback to continuously optimize meal quality.

### 🧑‍🏫 Mess Committee Faculty
- **Centralized Complaint Resolution**: Review active complaints with geotagged evidence and student reliability trust badges (e.g. `🛡️ 90% Trust`).
- **Granular Rejection System**: Categorize rejected complaints (*Duplicate* — 0 penalty; *Spam, Fake, Inappropriate, Unrelated* — 10-point penalty).
- **Auto-Archiving**: View current complaints with 48-hour auto-filtering for resolved/rejected issues.
- **Notice Board**: Broadcast official announcements and notices to students and mess staff.

### 🏫 College Admins
- **User Approvals**: Review and approve student, vendor, and committee sign-up requests.
- **Mess Management**: Create mess halls and assign staff, vendors, and students.
- **Email Invitations**: Invite new faculty and vendor staff via email invite tokens.

### 🌐 Super Admins
- **College Onboarding**: Manage multi-tenant college profiles across the platform.
- **System-Wide Administration**: Create and assign College Admins and oversee global operations.

---

## 🌟 Key Technical Features

| Feature | Description |
| :--- | :--- |
| **📍 Geotagged Evidence** | Ensures complaint authenticity by capturing geographical coordinates during submission. |
| **🖼️ Image Viewer Overlay** | Full-screen interactive modal for inspecting evidence photos in high definition. |
| **🛡️ TrustMeter Penalty & Ban Engine** | Protects committee members from spam through dynamic trust scoring and automated 7-day suspensions. |
| **⏱️ 48-Hour Filter Cutoff** | Keeps dashboards focused by auto-filtering resolved/rejected complaints older than 2 days. |
| **🔐 Role-Based Access Control (RBAC)** | Multi-tier authorization securing endpoints across 5 distinct user roles. |
| **📧 Invitation Workflow** | Token-based email invitation system for seamless admin onboarding. |

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: [React 18](https://reactjs.org/) + [Vite 8](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Routing**: [React Router v7](https://reactrouter.com/)
- **HTTP Client**: [Axios](https://axios-http.com/) (with JWT interceptors)
- **Icons & UI Notifications**: [Lucide React](https://lucide.dev/), [React Hot Toast](https://react-hot-toast.com/)

### Backend
- **Runtime**: [Node.js](https://nodejs.org/) (v18+)
- **Framework**: [Express v5](https://expressjs.com/)
- **Database**: [MongoDB](https://www.mongodb.com/) with [Mongoose v9](https://mongoosejs.com/)
- **Authentication**: JWT (HttpOnly Cookies & Bearer Tokens) with [Bcrypt](https://github.com/kelektiv/node.bcrypt.js)
- **Validation**: [Zod](https://zod.dev/)
- **File Uploads**: [Multer](https://github.com/expressjs/multer)
- **Mailing**: [Nodemailer](https://nodemailer.com/)

---

## 📁 Repository Structure

```
MessConnect/
├── client/                     # Frontend React + Vite Application
│   ├── src/
│   │   ├── api/                # Axios instance & endpoint configurations
│   │   ├── components/         # Reusable UI & Layout components
│   │   ├── pages/              # Role-specific dashboards & feature pages
│   │   │   ├── Admin/          # College Admin & Super Admin pages
│   │   │   ├── Auth/           # Login, Signup, Invites, Password Reset
│   │   │   ├── Complaints/     # Complaints list & submission forms
│   │   │   ├── Dashboard/      # Student, Vendor & Committee dashboards
│   │   │   ├── Feedback/       # Meal ratings & feedback
│   │   │   ├── Notices/        # Institutional notice board
│   │   │   ├── Staff/          # Vendor staff directory
│   │   │   └── Timetable/      # Weekly menu schedules
│   │   ├── store/              # Zustand global state stores
│   │   ├── App.jsx             # Route definitions & guards
│   │   └── main.jsx            # Entry point
│   ├── package.json
│   └── vite.config.js
│
└── server/                     # Backend Express REST API Server
    ├── src/
    │   ├── config/             # Database connection & env configurations
    │   ├── controllers/        # Business logic for all modules
    │   ├── middleware/         # Auth, RBAC, ban recovery & error handlers
    │   ├── models/             # Mongoose schemas (User, Complaint, Mess, etc.)
    │   ├── routes/             # Express API routes
    │   └── utils/              # Helper utilities
    ├── uploads/                # Static asset storage for evidence images
    ├── create-admin.js         # Bootstrap script for administrative accounts
    ├── package.json
    └── server.js               # Express application entry point
```

---

## ⚡ Quick Start Guide

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **MongoDB**: Local instance or MongoDB Atlas Connection URI
- **npm** or **yarn**

---

### 1. Server Setup

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Create .env file based on example
cp .env.example .env
```

Configure your `server/.env` file:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/messconnect
CLIENT_URL=http://localhost:3000
JWT_SECRET=your_super_secret_jwt_key_min_32_characters

# Optional: Email Service Credentials for Invitations / Password Reset
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
```

Start the backend server:
```bash
# Development mode with nodemon
npm run dev

# Production mode
npm start
```
The server will run on `http://localhost:5000`.

---

### 2. Client Setup

```bash
# Navigate to client directory
cd ../client

# Install dependencies
npm install
```

Start the development server:
```bash
npm run dev
```
The client application will run on `http://localhost:3000` (or `http://localhost:5173`).

---

## 📡 API Endpoint Overview

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new user | Public |
| `POST` | `/api/auth/login` | User authentication | Public |
| `GET` | `/api/auth/me` | Fetch authenticated user details | Protected |
| `GET` | `/api/complaints` | Fetch active complaints (48h cutoff filter) | Protected |
| `POST` | `/api/complaints` | Submit geotagged complaint | Student |
| `PATCH`| `/api/complaints/:id/status` | Update complaint status & apply penalties | Committee |
| `GET` | `/api/timetable` | Get weekly mess timetable | Protected |
| `POST` | `/api/timetable` | Update weekly timetable | Vendor |
| `GET` | `/api/staff` | Fetch mess staff directory | Protected |
| `POST` | `/api/staff` | Add new staff member | Vendor |
| `GET` | `/api/notices` | View published notices | Protected |
| `POST` | `/api/notices` | Create institutional notice | Committee / Admin |

---

## 📌 Project Status

- **Status**: Active Core Development (Updated to Date)
- **Completed Milestones**:
  - Multi-tenant architecture & multi-role RBAC setup
  - Geotagged complaint filing with image evidence & full-screen photo modal
  - TrustMeter rating system, automatic suspensions, and recovery mechanisms
  - 48-hour complaint horizon auto-filtering
  - Weekly menu management & staff directory
  - Admin approval workflows & invitation system

---

## 📄 License

This project is open-source and available under the [ISC License](LICENSE).
