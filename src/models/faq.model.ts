import { Schema, model, Document, Model } from "mongoose";

// FAQ interface with instance methods
export interface IFAQ extends Document {
  question: string;
  answer: string;
  isActive: boolean;
  displayOrder: number;
  createdBy: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  toggleStatus(): Promise<IFAQ>;
}

// FAQ model interface with static methods
export interface IFAQModel extends Model<IFAQ> {
  getActiveFAQs(
    page?: number,
    limit?: number,
    search?: string
  ): Promise<IFAQ[]>;
}

// FAQ schema
const FAQSchema = new Schema<IFAQ>(
  {
    question: {
      type: String,
      required: [true, "السؤال مطلوب"],
      trim: true,
      minlength: [3, "السؤال يجب أن يكون أكثر من 3 أحرف"],
      maxlength: [500, "السؤال يجب أن يكون أقل من 500 حرف"],
    },
    answer: {
      type: String,
      required: [true, "الإجابة مطلوبة"],
      trim: true,
      minlength: [10, "الإجابة يجب أن تكون أكثر من 10 أحرف"],
      maxlength: [2000, "الإجابة يجب أن تكون أقل من 2000 حرف"],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
      min: [0, "ترتيب العرض يجب أن يكون رقم موجب"],
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "منشئ السؤال مطلوب"],
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance optimization
FAQSchema.index({ isActive: 1, displayOrder: 1 }); // For public FAQ listing
FAQSchema.index({ question: "text", answer: "text" }); // For text search
FAQSchema.index({ createdAt: -1 }); // For sorting by creation date

// Pre-save middleware to auto-increment display order for new FAQs
// FAQSchema.pre("save", async function (this: IFAQ, next) {
//   if (this.isNew && this.displayOrder === 0) {
//     try {
//       const lastFAQ = await this.constructor.findOne(
//         {},
//         {},
//         { sort: { displayOrder: -1 } }
//       );
//       this.displayOrder = lastFAQ ? lastFAQ.displayOrder + 1 : 1;
//     } catch (error) {
//       return next(error as Error);
//     }
//   }
//   next();
// });

// Static method to get active FAQs with pagination
FAQSchema.statics.getActiveFAQs = function (
  page: number = 1,
  limit: number = 10,
  search?: string
) {
  const skip = (page - 1) * limit;
  let query: any = { isActive: true };

  // Add search filter if provided
  if (search) {
    query.$text = { $search: search };
  }

  return this.find(query)
    .populate("createdBy", "fullName email")
    .sort(
      search
        ? { score: { $meta: "textScore" } }
        : { displayOrder: 1, createdAt: -1 }
    )
    .skip(skip)
    .limit(limit)
    .lean();
};

// Instance method to toggle active status
FAQSchema.methods.toggleStatus = function () {
  this.isActive = !this.isActive;
  return this.save();
};

export const FAQ = model<IFAQ, IFAQModel>("FAQ", FAQSchema);
