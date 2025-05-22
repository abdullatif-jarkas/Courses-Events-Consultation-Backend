# 🧠 Courses & Consultations Platform - Backend

This repository contains the **backend** code for a web platform offering recorded courses, live events, and specialized consultations. The system supports different user types with role-based access, multiple payment methods, and features tailored to educational and consulting services.

## 🚀 Features

- JWT-based authentication using **HttpOnly Secure Cookies**
- Role-based access for 3 user types: Admin, Employee, Regular User
- Booking system for consultations with online/offline payment support
- Event management (including workshops and coffee sessions)
- Integration with Stripe for online payments
- MongoDB for data storage with Mongoose ORM
- Secure file uploads using Multer
- Multi-language support for frontend (handled via `react-i18next`)

> 📝 This repo is **backend only**. The frontend is implemented in a separate repository using React + TypeScript + Tailwind CSS.

---

## 🛠️ Tech Stack

- **Node.js** & **Express.js**
- **MongoDB** with Mongoose
- **JWT** for authentication
- **Stripe API** for payment processing
- **Multer** for file uploads
- **Cookie-parser**, **CORS**, and other Express middlewares

---

## 📂 Project Structure

```
src/
│
├── controllers/       # Route logic and business operations
├── models/            # Mongoose schemas and models
├── routes/            # Express route definitions
├── middlewares/       # Authentication, error handling, etc.
├── services/          # Business logic (e.g., payment, email)
├── utils/             # Utility functions
└── config/            # Environment and DB configurations
```

---

## 🔐 Authentication

- Login and registration via email and password
- Tokens stored in **HttpOnly Secure Cookies**
- Middleware protects private routes and verifies roles

---

## 💳 Payment Methods

1. **Stripe** – For international payments
2. **Local Electronic Payment** – For users inside Syria
3. **Direct Office Payment** – For in-person transactions

---

## 👤 User Roles

- **Admin**: Full access (create/edit events, consultations, view users, etc.)
- **Employee**: Limited access to manage assigned content
- **User**: Can view events, buy courses, and book consultations

---

## 📅 Upcoming Features

- Rating and review system for courses and consultations
- Admin dashboard with analytics
- Email notifications on bookings and registration
- React Native mobile app

---

## 📦 Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Create a `.env` file

Include the following variables:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:5173
STRIPE_SECRET_KEY=your_stripe_key
```

### 3. Run the development server

```bash
npm run dev
```

---

## 👨‍💻 Project Team

- **Backend Developer**: Abdullatif Jarkas
- **Frontend Developer**: Haneen Al Hariri

---

## 📬 Contact

- Email: thesolutionspark@gmail.com
- WhatsApp: https://wa.me/message/MKFSGPCLJZU7F1