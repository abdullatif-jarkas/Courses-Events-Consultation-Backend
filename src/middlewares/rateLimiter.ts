import rateLimit from "express-rate-limit";

// 📦 عام لجميع الـ APIs
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 100, // حد الطلبات خلال هذه الفترة من نفس IP
  message: {
    status: "error",
    message: "Too many requests, please try again later.",
  },
  standardHeaders: true, // لإرسال RateLimit-* headers
  legacyHeaders: false, // عدم إرسال X-RateLimit-* headers القديمة
});

// 🔐 خاص بتسجيل الدخول
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 5, // فقط 5 محاولات تسجيل دخول خلال الفترة
  message: {
    status: "error",
    message: "Too many login attempts, try again in 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
