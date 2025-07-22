import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { Podcast, IPodcast } from "@/models/podcast.model";
import {
  validateCreatePodcast,
  validateUpdatePodcast,
  validatePodcastId,
  validateGetPodcastsQuery,
  validateToggleStatus,
  CreatePodcastInput,
  UpdatePodcastInput,
  GetPodcastsQuery,
} from "@/validators/podcastSchema";

// Standardized response format (same as payment controllers and FAQ)
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
 * @route   POST /api/podcasts
 * @access  Private (Admin only)
 * @desc    Create new podcast
 */
export const createPodcast = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      // Input validation
      const validationResult = validateCreatePodcast(req.body);
      if (!validationResult.success) {
        const response: ApiResponse = {
          status: "error",
          message: "بيانات غير صالحة",
          errors: validationResult.error.flatten().fieldErrors,
        };
        res.status(400).json(response);
        return;
      } 

      const podcastData: CreatePodcastInput = validationResult.data;
      const userId = req.user!.userId;

      // Create podcast
      const podcast = await Podcast.create({
        ...podcastData,
        createdBy: userId,
      });

      // Populate creator information
      await podcast.populate("createdBy", "fullName email");

      const response: ApiResponse = {
        status: "success",
        message: "تم إنشاء البودكاست بنجاح",
        data: podcast,
      };
      res.status(201).json(response);
    } catch (error) {
      console.error("خطأ في إنشاء البودكاست:", error);
      const response: ApiResponse = {
        status: "error",
        message: "فشل في إنشاء البودكاست",
        error: error instanceof Error ? error.message : String(error),
      };
      res.status(500).json(response);
    }
  }
);

/**
 * @route   GET /api/podcasts
 * @access  Public
 * @desc    Get all active podcasts with pagination and filtering
 */
export const getPodcasts = asyncHandler(async (req: Request, res: Response) => {
  try {
    // Input validation
    const validationResult = validateGetPodcastsQuery(req.query);
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
      category,
      search,
      sortBy,
      sortOrder,
    }: GetPodcastsQuery = validationResult.data;

    const skip = (page - 1) * limit;
    let query: any = { isActive: true };

    // Add category filter
    if (category && category !== "all") {
      query.category = category;
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
        case "title":
          sortObject.title = sortOrder === "desc" ? -1 : 1;
          break;
        default:
          sortObject.displayOrder = 1;
      }
    }

    // Execute query
    const [podcasts, total] = await Promise.all([
      Podcast.find(query)
        .populate("createdBy", "fullName email")
        .sort(sortObject)
        .skip(skip)
        .limit(limit)
        .lean(),
      Podcast.countDocuments(query),
    ]);

    const response: ApiResponse = {
      status: "success",
      data: podcasts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
    res.status(200).json(response);
  } catch (error) {
    console.error("خطأ في جلب البودكاست:", error);
    const response: ApiResponse = {
      status: "error",
      message: "فشل في جلب البودكاست",
      error: error instanceof Error ? error.message : String(error),
    };
    res.status(500).json(response);
  }
});

/**
 * @route   GET /api/podcasts/admin
 * @access  Private (Admin only)
 * @desc    Get all podcasts including inactive ones for admin panel
 */
export const getAdminPodcasts = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      // Input validation
      const validationResult = validateGetPodcastsQuery(req.query);
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
        category,
        search,
        sortBy,
        sortOrder,
        includeInactive,
      }: GetPodcastsQuery = validationResult.data;

      const skip = (page - 1) * limit;
      let query: any = {};

      // Include inactive podcasts only if explicitly requested
      if (!includeInactive) {
        query.isActive = true;
      }

      // Add category filter
      if (category && category !== "all") {
        query.category = category;
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
          case "title":
            sortObject.title = sortOrder === "desc" ? -1 : 1;
            break;
          default:
            sortObject.displayOrder = 1;
        }
      }

      // Execute query
      const [podcasts, total] = await Promise.all([
        Podcast.find(query)
          .populate("createdBy", "fullName email")
          .sort(sortObject)
          .skip(skip)
          .limit(limit),
        Podcast.countDocuments(query),
      ]);

      const response: ApiResponse = {
        status: "success",
        data: podcasts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
      res.status(200).json(response);
    } catch (error) {
      console.error("خطأ في جلب البودكاست للإدارة:", error);
      const response: ApiResponse = {
        status: "error",
        message: "فشل في جلب البودكاست",
        error: error instanceof Error ? error.message : String(error),
      };
      res.status(500).json(response);
    }
  }
);

/**
 * @route   GET /api/podcasts/:id
 * @access  Public
 * @desc    Get single podcast by ID
 */
export const getPodcastById = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      // Input validation
      const validationResult = validatePodcastId(req.params);
      if (!validationResult.success) {
        const response: ApiResponse = {
          status: "error",
          message: "معرف البودكاست غير صالح",
          errors: validationResult.error.flatten().fieldErrors,
        };
        res.status(400).json(response);
        return;
      }

      const { id } = validationResult.data;

      // Find podcast
      const podcast = await Podcast.findOne({
        _id: id,
        isActive: true,
      }).populate("createdBy", "fullName email");

      if (!podcast) {
        const response: ApiResponse = {
          status: "error",
          message: "البودكاست غير موجود",
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        status: "success",
        data: podcast,
      };
      res.status(200).json(response);
    } catch (error) {
      console.error("خطأ في جلب البودكاست:", error);
      const response: ApiResponse = {
        status: "error",
        message: "فشل في جلب البودكاست",
        error: error instanceof Error ? error.message : String(error),
      };
      res.status(500).json(response);
    }
  }
);

/**
 * @route   PUT /api/podcasts/:id
 * @access  Private (Admin only)
 * @desc    Update podcast
 */
export const updatePodcast = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      // Validate podcast ID
      const idValidation = validatePodcastId(req.params);
      if (!idValidation.success) {
        const response: ApiResponse = {
          status: "error",
          message: "معرف البودكاست غير صالح",
          errors: idValidation.error.flatten().fieldErrors,
        };
        res.status(400).json(response);
        return;
      }

      // Validate update data
      const dataValidation = validateUpdatePodcast(req.body);
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
      const updateData: UpdatePodcastInput = dataValidation.data;

      // Find and update podcast
      const podcast = await Podcast.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      }).populate("createdBy", "fullName email");

      if (!podcast) {
        const response: ApiResponse = {
          status: "error",
          message: "البودكاست غير موجود",
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        status: "success",
        message: "تم تحديث البودكاست بنجاح",
        data: podcast,
      };
      res.status(200).json(response);
    } catch (error) {
      console.error("خطأ في تحديث البودكاست:", error);
      const response: ApiResponse = {
        status: "error",
        message: "فشل في تحديث البودكاست",
        error: error instanceof Error ? error.message : String(error),
      };
      res.status(500).json(response);
    }
  }
);

/**
 * @route   DELETE /api/podcasts/:id
 * @access  Private (Admin only)
 * @desc    Delete podcast
 */
export const deletePodcast = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      // Input validation
      const validationResult = validatePodcastId(req.params);
      if (!validationResult.success) {
        const response: ApiResponse = {
          status: "error",
          message: "معرف البودكاست غير صالح",
          errors: validationResult.error.flatten().fieldErrors,
        };
        res.status(400).json(response);
        return;
      }

      const { id } = validationResult.data;

      // Find and delete podcast
      const podcast = await Podcast.findByIdAndDelete(id);

      if (!podcast) {
        const response: ApiResponse = {
          status: "error",
          message: "البودكاست غير موجود",
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        status: "success",
        message: "تم حذف البودكاست بنجاح",
      };
      res.status(200).json(response);
    } catch (error) {
      console.error("خطأ في حذف البودكاست:", error);
      const response: ApiResponse = {
        status: "error",
        message: "فشل في حذف البودكاست",
        error: error instanceof Error ? error.message : String(error),
      };
      res.status(500).json(response);
    }
  }
);

/**
 * @route   PATCH /api/podcasts/:id/toggle-status
 * @access  Private (Admin only)
 * @desc    Toggle podcast active/inactive status
 */
export const togglePodcastStatus = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      // Input validation
      const validationResult = validatePodcastId(req.params);
      if (!validationResult.success) {
        const response: ApiResponse = {
          status: "error",
          message: "معرف البودكاست غير صالح",
          errors: validationResult.error.flatten().fieldErrors,
        };
        res.status(400).json(response);
        return;
      }

      const { id } = validationResult.data;

      // Find podcast and toggle status
      const podcast = await Podcast.findById(id);
      if (!podcast) {
        const response: ApiResponse = {
          status: "error",
          message: "البودكاست غير موجود",
        };
        res.status(404).json(response);
        return;
      }

      // Toggle status using instance method
      await podcast.toggleStatus();
      await podcast.populate("createdBy", "fullName email");

      const response: ApiResponse = {
        status: "success",
        message: `تم ${
          podcast.isActive ? "تفعيل" : "إلغاء تفعيل"
        } البودكاست بنجاح`,
        data: podcast,
      };
      res.status(200).json(response);
    } catch (error) {
      console.error("خطأ في تغيير حالة البودكاست:", error);
      const response: ApiResponse = {
        status: "error",
        message: "فشل في تغيير حالة البودكاست",
        error: error instanceof Error ? error.message : String(error),
      };
      res.status(500).json(response);
    }
  }
);

/**
 * @route   GET /api/podcasts/categories
 * @access  Public
 * @desc    Get all podcast categories
 */
export const getPodcastCategories = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      // Get distinct categories from active podcasts
      const categories = await Podcast.getCategories();

      const response: ApiResponse = {
        status: "success",
        data: categories,
      };
      res.status(200).json(response);
    } catch (error) {
      console.error("خطأ في جلب الفئات:", error);
      const response: ApiResponse = {
        status: "error",
        message: "فشل في جلب الفئات",
        error: error instanceof Error ? error.message : String(error),
      };
      res.status(500).json(response);
    }
  }
);
