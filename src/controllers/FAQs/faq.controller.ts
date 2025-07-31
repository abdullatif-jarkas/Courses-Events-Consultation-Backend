import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { FAQ } from "@/models/faq.model";
import {
  validateCreateFAQ,
  validateUpdateFAQ,
  validateFAQId,
  validateGetFAQsQuery,
  CreateFAQInput,
  UpdateFAQInput,
  GetFAQsQuery,
} from "@/validators/faqSchema";

// Standardized response format (same as payment controllers)
interface ApiResponse<T = any> {
  status: "success" | "error";
  message?: string;
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

/**
 * @route   POST /api/faqs
 * @access  Private (Admin only)
 * @desc    Create new FAQ
 */
export const createFAQ = asyncHandler(async (req: Request, res: Response) => {
  try {
    // Input validation
    const validationResult = validateCreateFAQ(req.body);
    if (!validationResult.success) {
      const response: ApiResponse = {
        status: "error",
        message: "بيانات غير صالحة",
        errors: validationResult.error.flatten().fieldErrors,
      };
      res.status(400).json(response);
      return;
    }

    const faqData: CreateFAQInput = validationResult.data;
    const userId = req.user!.userId;

    // Create FAQ
    const faq = await FAQ.create({
      ...faqData,
      createdBy: userId,
    });

    // Populate creator information
    await faq.populate("createdBy", "fullName email");

    const response: ApiResponse = {
      status: "success",
      message: "تم إنشاء السؤال بنجاح",
      data: faq,
    };
    res.status(201).json(response);
  } catch (error) {
    console.error("خطأ في إنشاء السؤال:", error);
    const response: ApiResponse = {
      status: "error",
      message: "فشل في إنشاء السؤال",
      error: error instanceof Error ? error.message : String(error),
    };
    res.status(500).json(response);
  }
});

/**
 * @route   GET /api/faqs
 * @access  Public
 * @desc    Get all active FAQs with pagination and filtering
 */
export const getFAQs = asyncHandler(async (req: Request, res: Response) => {
  try {
    // Input validation
    const validationResult = validateGetFAQsQuery(req.query);
    if (!validationResult.success) {
      const response: ApiResponse = {
        status: "error",
        message: "معاملات البحث غير صالحة",
        errors: validationResult.error.flatten().fieldErrors,
      };
      res.status(400).json(response);
      return;
    }

    const { page, limit, search, sortBy, sortOrder }: GetFAQsQuery =
      validationResult.data;

    const skip = (page - 1) * limit;
    let query: any = { isActive: true };

    // Add search filter
    if (search) {
      query.$text = { $search: search };
    }

    // Build sort object
    let sortObject: any = {};
    if (search) {
      sortObject = { score: { $meta: "textScore" } };
    } else {
      switch (sortBy) {
        case "displayOrder":
          sortObject.displayOrder = sortOrder === "desc" ? -1 : 1;
          break;
        case "createdAt":
          sortObject.createdAt = sortOrder === "desc" ? -1 : 1;
          break;
        case "question":
          sortObject.question = sortOrder === "desc" ? -1 : 1;
          break;
        default:
          sortObject.displayOrder = 1;
      }
    }

    // Execute query
    const [faqs, total] = await Promise.all([
      FAQ.find(query)
        .populate("createdBy", "fullName email")
        .sort(sortObject)
        .skip(skip)
        .limit(limit)
        .lean(),
      FAQ.countDocuments(query),
    ]);

    const response: ApiResponse = {
      status: "success",
      data: faqs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
    res.status(200).json(response);
  } catch (error) {
    console.error("خطأ في جلب الأسئلة:", error);
    const response: ApiResponse = {
      status: "error",
      message: "فشل في جلب الأسئلة",
      error: error instanceof Error ? error.message : String(error),
    };
    res.status(500).json(response);
  }
});

/**
 * @route   GET /api/faqs/admin
 * @access  Private (Admin only)
 * @desc    Get all FAQs including inactive ones for admin panel
 */
export const getAdminFAQs = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      // Input validation
      const validationResult = validateGetFAQsQuery(req.query);
      if (!validationResult.success) {
        const response: ApiResponse = {
          status: "error",
          message: "معاملات البحث غير صالحة",
          errors: validationResult.error.flatten().fieldErrors,
        };
        res.status(400).json(response);
        return;
      }

      const {
        page,
        limit,
        search,
        sortBy,
        sortOrder,
        includeInactive,
      }: GetFAQsQuery = validationResult.data;

      const skip = (page - 1) * limit;
      let query: any = {};

      // Include inactive FAQs only if explicitly requested
      if (!includeInactive) {
        query.isActive = true;
      }

      // Add search filter
      if (search) {
        query.$text = { $search: search };
      }

      // Build sort object
      let sortObject: any = {};
      if (search) {
        sortObject = { score: { $meta: "textScore" } };
      } else {
        switch (sortBy) {
          case "displayOrder":
            sortObject.displayOrder = sortOrder === "desc" ? -1 : 1;
            break;
          case "createdAt":
            sortObject.createdAt = sortOrder === "desc" ? -1 : 1;
            break;
          case "question":
            sortObject.question = sortOrder === "desc" ? -1 : 1;
            break;
          default:
            sortObject.displayOrder = 1;
        }
      }

      // Execute query
      const [faqs, total] = await Promise.all([
        FAQ.find(query)
          .populate("createdBy", "fullName email")
          .sort(sortObject)
          .skip(skip)
          .limit(limit),
        FAQ.countDocuments(query),
      ]);

      const response: ApiResponse = {
        status: "success",
        data: faqs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
      res.status(200).json(response);
    } catch (error) {
      console.error("خطأ في جلب الأسئلة للإدارة:", error);
      const response: ApiResponse = {
        status: "error",
        message: "فشل في جلب الأسئلة",
        error: error instanceof Error ? error.message : String(error),
      };
      res.status(500).json(response);
    }
  }
);

/**
 * @route   GET /api/faqs/:id
 * @access  Public
 * @desc    Get single FAQ by ID
 */
// export const getFAQById = asyncHandler(async (req: Request, res: Response) => {
//   try {
//     // Input validation
//     const validationResult = validateFAQId(req.params);
//     if (!validationResult.success) {
//       const response: ApiResponse = {
//         status: "error",
//         message: "معرف السؤال غير صالح",
//         errors: validationResult.error.flatten().fieldErrors,
//       };
//       res.status(400).json(response);
//       return;
//     }

//     const { id } = validationResult.data;

//     // Find FAQ
//     const faq = await FAQ.findOne({ _id: id, isActive: true }).populate(
//       "createdBy",
//       "fullName email"
//     );

//     if (!faq) {
//       const response: ApiResponse = {
//         status: "error",
//         message: "السؤال غير موجود",
//       };
//       res.status(404).json(response);
//       return;
//     }

//     const response: ApiResponse = {
//       status: "success",
//       data: faq,
//     };
//     res.status(200).json(response);
//   } catch (error) {
//     console.error("خطأ في جلب السؤال:", error);
//     const response: ApiResponse = {
//       status: "error",
//       message: "فشل في جلب السؤال",
//       error: error instanceof Error ? error.message : String(error),
//     };
//     res.status(500).json(response);
//   }
// });

/**
 * @route   PUT /api/faqs/:id
 * @access  Private (Admin only)
 * @desc    Update FAQ
 */
export const updateFAQ = asyncHandler(async (req: Request, res: Response) => {
  try {
    // Validate FAQ ID
    const idValidation = validateFAQId(req.params);
    if (!idValidation.success) {
      const response: ApiResponse = {
        status: "error",
        message: "معرف السؤال غير صالح",
        errors: idValidation.error.flatten().fieldErrors,
      };
      res.status(400).json(response);
      return;
    }

    // Validate update data
    const dataValidation = validateUpdateFAQ(req.body);
    if (!dataValidation.success) {
      const response: ApiResponse = {
        status: "error",
        message: "بيانات التحديث غير صالحة",
        errors: dataValidation.error.flatten().fieldErrors,
      };
      res.status(400).json(response);
      return;
    }

    const { id } = idValidation.data;
    const updateData: UpdateFAQInput = dataValidation.data;

    // Find and update FAQ
    const faq = await FAQ.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("createdBy", "fullName email");

    if (!faq) {
      const response: ApiResponse = {
        status: "error",
        message: "السؤال غير موجود",
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse = {
      status: "success",
      message: "تم تحديث السؤال بنجاح",
      data: faq,
    };
    res.status(200).json(response);
  } catch (error) {
    console.error("خطأ في تحديث السؤال:", error);
    const response: ApiResponse = {
      status: "error",
      message: "فشل في تحديث السؤال",
      error: error instanceof Error ? error.message : String(error),
    };
    res.status(500).json(response);
  }
});

/**
 * @route   DELETE /api/faqs/:id
 * @access  Private (Admin only)
 * @desc    Delete FAQ
 */
export const deleteFAQ = asyncHandler(async (req: Request, res: Response) => {
  try {
    // Input validation
    const validationResult = validateFAQId(req.params);
    if (!validationResult.success) {
      const response: ApiResponse = {
        status: "error",
        message: "معرف السؤال غير صالح",
        errors: validationResult.error.flatten().fieldErrors,
      };
      res.status(400).json(response);
      return;
    }

    const { id } = validationResult.data;

    // Find and delete FAQ
    const faq = await FAQ.findByIdAndDelete(id);

    if (!faq) {
      const response: ApiResponse = {
        status: "error",
        message: "السؤال غير موجود",
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse = {
      status: "success",
      message: "تم حذف السؤال بنجاح",
    };
    res.status(200).json(response);
  } catch (error) {
    console.error("خطأ في حذف السؤال:", error);
    const response: ApiResponse = {
      status: "error",
      message: "فشل في حذف السؤال",
      error: error instanceof Error ? error.message : String(error),
    };
    res.status(500).json(response);
  }
});

/**
 * @route   PATCH /api/faqs/:id/toggle-status
 * @access  Private (Admin only)
 * @desc    Toggle FAQ active/inactive status
 */
export const toggleFAQStatus = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      // Input validation
      const validationResult = validateFAQId(req.params);
      if (!validationResult.success) {
        const response: ApiResponse = {
          status: "error",
          message: "معرف السؤال غير صالح",
          errors: validationResult.error.flatten().fieldErrors,
        };
        res.status(400).json(response);
        return;
      }

      const { id } = validationResult.data;

      // Find FAQ and toggle status
      const faq = await FAQ.findById(id);
      if (!faq) {
        const response: ApiResponse = {
          status: "error",
          message: "السؤال غير موجود",
        };
        res.status(404).json(response);
        return;
      }

      // Toggle status using instance method
      await faq.toggleStatus();
      await faq.populate("createdBy", "fullName email");

      const response: ApiResponse = {
        status: "success",
        message: `تم ${faq.isActive ? "تفعيل" : "إلغاء تفعيل"} السؤال بنجاح`,
        data: faq,
      };
      res.status(200).json(response);
    } catch (error) {
      console.error("خطأ في تغيير حالة السؤال:", error);
      const response: ApiResponse = {
        status: "error",
        message: "فشل في تغيير حالة السؤال",
        error: error instanceof Error ? error.message : String(error),
      };
      res.status(500).json(response);
    }
  }
);