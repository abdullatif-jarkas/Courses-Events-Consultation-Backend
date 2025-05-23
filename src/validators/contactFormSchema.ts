import z from "zod";

export const contactFormSchema = z.object({
  name: z.string().min(2, "الاسم يجب أن يكون أكثر من حرفين"),
  email: z.string().email("البريد الإلكتروني غير صالح"),
  subject: z.string().min(3, "الموضوع يجب أن يكون أكثر من 3 أحرف"),
  message: z.string().min(10, "الرسالة يجب أن تكون أكثر من 10 أحرف"),
});