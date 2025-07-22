import { z } from "zod";
import { Types } from "mongoose";

// YouTube URL validation regex
const youtubeUrlRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/)[\w-]+(&[\w=]*)?$/;

// Image URL validation regex
const imageUrlRegex = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i;

// Create Podcast validation schema
export const createPodcastSchema = z.object({
  title: z.string()
    .min(3, "عنوان البودكاست يجب أن يكون أكثر من 3 أحرف")
    .max(200, "عنوان البودكاست يجب أن يكون أقل من 200 حرف")
    .trim(),
  youtubeUrl: z.string()
    .url("رابط اليوتيوب يجب أن يكون رابط صالح")
    .regex(youtubeUrlRegex, "رابط اليوتيوب غير صالح")
    .trim(),
  imageUrl: z.string()
    .url("رابط الصورة يجب أن يكون رابط صالح")
    .regex(imageUrlRegex, "رابط الصورة غير صالح")
    .trim(),
  description: z.string()
    .max(1000, "وصف البودكاست يجب أن يكون أقل من 1000 حرف")
    .trim()
    .optional(),
  
  isActive: z.boolean().optional().default(true),
  displayOrder: z.number()
    .min(0, "ترتيب العرض يجب أن يكون رقم موجب")
    .optional()
});

// Update Podcast validation schema
export const updatePodcastSchema = z.object({
  title: z.string()
    .min(3, "عنوان البودكاست يجب أن يكون أكثر من 3 أحرف")
    .max(200, "عنوان البودكاست يجب أن يكون أقل من 200 حرف")
    .trim()
    .optional(),
  youtubeUrl: z.string()
    .url("رابط اليوتيوب يجب أن يكون رابط صالح")
    .regex(youtubeUrlRegex, "رابط اليوتيوب غير صالح")
    .trim()
    .optional(),
  imageUrl: z.string()
    .url("رابط الصورة يجب أن يكون رابط صالح")
    .regex(imageUrlRegex, "رابط الصورة غير صالح")
    .trim()
    .optional(),
  description: z.string()
    .max(1000, "وصف البودكاست يجب أن يكون أقل من 1000 حرف")
    .trim()
    .optional(),
  category: z.string()
    .trim()
    .max(100, "اسم الفئة يجب أن يكون أقل من 100 حرف")
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

// Podcast ID validation schema
export const podcastIdSchema = z.object({
  id: z.string().refine((id) => Types.ObjectId.isValid(id), {
    message: "معرف البودكاست غير صالح"
  })
});

// Get Podcasts query validation schema
export const getPodcastsQuerySchema = z.object({
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
  category: z.string()
    .trim()
    .optional(),
  search: z.string()
    .trim()
    .min(2, "مصطلح البحث يجب أن يكون أكثر من حرفين")
    .optional(),
  sortBy: z.enum(["displayOrder", "createdAt", "title"])
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
export const validateCreatePodcast = (data: unknown) => createPodcastSchema.safeParse(data);
export const validateUpdatePodcast = (data: unknown) => updatePodcastSchema.safeParse(data);
export const validatePodcastId = (data: unknown) => podcastIdSchema.safeParse(data);
export const validateGetPodcastsQuery = (data: unknown) => getPodcastsQuerySchema.safeParse(data);
export const validateToggleStatus = (data: unknown) => toggleStatusSchema.safeParse(data);

// Type exports for TypeScript
export type CreatePodcastInput = z.infer<typeof createPodcastSchema>;
export type UpdatePodcastInput = z.infer<typeof updatePodcastSchema>;
export type GetPodcastsQuery = z.infer<typeof getPodcastsQuerySchema>;
