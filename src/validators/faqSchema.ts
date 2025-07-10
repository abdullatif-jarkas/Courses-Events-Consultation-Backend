import { z } from "zod";
import { Types } from "mongoose";

// Create FAQ validation schema
export const createFAQSchema = z.object({
  question: z.string()
    .min(3, "السؤال يجب أن يكون أكثر من 3 أحرف")
    .max(500, "السؤال يجب أن يكون أقل من 500 حرف")
    .trim(),
  answer: z.string()
    .min(10, "الإجابة يجب أن تكون أكثر من 10 أحرف")
    .max(2000, "الإجابة يجب أن تكون أقل من 2000 حرف")
    .trim(),
  isActive: z.boolean().optional().default(true),
  displayOrder: z.number()
    .min(0, "ترتيب العرض يجب أن يكون رقم موجب")
    .optional()
});

// Update FAQ validation schema
export const updateFAQSchema = z.object({
  question: z.string()
    .min(3, "السؤال يجب أن يكون أكثر من 3 أحرف")
    .max(500, "السؤال يجب أن يكون أقل من 500 حرف")
    .trim()
    .optional(),
  answer: z.string()
    .min(10, "الإجابة يجب أن تكون أكثر من 10 أحرف")
    .max(2000, "الإجابة يجب أن تكون أقل من 2000 حرف")
    .trim()
    .optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number()
    .min(0, "ترتيب العرض يجب أن يكون رقم موجب")
    .optional()
}).refine(
  (data) => Object.keys(data).length > 0,
  {
    message: "يجب توفير حقل واحد على الأقل للتحديث"
  }
);

// FAQ ID validation schema
export const faqIdSchema = z.object({
  id: z.string().refine((id) => Types.ObjectId.isValid(id), {
    message: "معرف السؤال غير صالح"
  })
});

// Get FAQs query validation schema
export const getFAQsQuerySchema = z.object({
  page: z.string()
    .optional()
    .transform((val) => val ? parseInt(val, 10) : 1)
    .refine((val) => val > 0, { message: "رقم الصفحة يجب أن يكون رقم موجب" }),
  limit: z.string()
    .optional()
    .transform((val) => val ? parseInt(val, 10) : 10)
    .refine((val) => val > 0 && val <= 100, { 
      message: "حد العناصر يجب أن يكون بين 1 و 100" 
    }),
  search: z.string()
    .trim()
    .min(2, "مصطلح البحث يجب أن يكون أكثر من حرفين")
    .optional(),
  sortBy: z.enum(["displayOrder", "createdAt", "question"])
    .optional()
    .default("displayOrder"),
  sortOrder: z.enum(["asc", "desc"])
    .optional()
    .default("asc"),
  includeInactive: z.string()
    .optional()
    .transform((val) => val === "true")
});

// Toggle status validation schema
export const toggleStatusSchema = z.object({
  isActive: z.boolean()
});

// Export validation helper functions
export const validateCreateFAQ = (data: unknown) => createFAQSchema.safeParse(data);
export const validateUpdateFAQ = (data: unknown) => updateFAQSchema.safeParse(data);
export const validateFAQId = (data: unknown) => faqIdSchema.safeParse(data);
export const validateGetFAQsQuery = (data: unknown) => getFAQsQuerySchema.safeParse(data);
export const validateToggleStatus = (data: unknown) => toggleStatusSchema.safeParse(data);

// Type exports for TypeScript
export type CreateFAQInput = z.infer<typeof createFAQSchema>;
export type UpdateFAQInput = z.infer<typeof updateFAQSchema>;
export type GetFAQsQuery = z.infer<typeof getFAQsQuerySchema>;
