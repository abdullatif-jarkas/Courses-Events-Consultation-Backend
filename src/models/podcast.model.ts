import { Schema, model, Document, Model } from "mongoose";

// Podcast interface with instance methods
export interface IPodcast extends Document {
  title: string;
  youtubeUrl: string;
  imageUrl: string;
  description?: string;
  category?: string;
  isActive: boolean;
  displayOrder: number;
  createdBy: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  toggleStatus(): Promise<IPodcast>;
}

// Podcast model interface with static methods
export interface IPodcastModel extends Model<IPodcast> {
  getActivePodcasts(
    page?: number,
    limit?: number,
    category?: string,
    search?: string
  ): Promise<IPodcast[]>;
  
  getCategories(): Promise<string[]>;
}

// Podcast schema
const PodcastSchema = new Schema<IPodcast>(
  {
    title: {
      type: String,
      required: [true, "عنوان البودكاست مطلوب"],
      trim: true,
      minlength: [3, "عنوان البودكاست يجب أن يكون أكثر من 3 أحرف"],
      maxlength: [200, "عنوان البودكاست يجب أن يكون أقل من 200 حرف"]
    },
    youtubeUrl: {
      type: String,
      required: [true, "رابط اليوتيوب مطلوب"],
      trim: true,
      validate: {
        validator: function(url: string) {
          // YouTube URL validation regex
          const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/)[\w-]+(&[\w=]*)?$/;
          return youtubeRegex.test(url);
        },
        message: "رابط اليوتيوب غير صالح"
      }
    },
    imageUrl: {
      type: String,
      required: [true, "رابط الصورة مطلوب"],
      trim: true,
      validate: {
        validator: function(url: string) {
          // Image URL validation regex
          const imageRegex = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i;
          return imageRegex.test(url);
        },
        message: "رابط الصورة غير صالح"
      }
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "وصف البودكاست يجب أن يكون أقل من 1000 حرف"]
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    displayOrder: {
      type: Number,
      default: 0,
      min: [0, "ترتيب العرض يجب أن يكون رقم موجب"],
      index: true
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "منشئ البودكاست مطلوب"],
      index: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for performance optimization
PodcastSchema.index({ isActive: 1, displayOrder: 1 }); // For public podcast listing
PodcastSchema.index({ category: 1, isActive: 1 }); // For category filtering
PodcastSchema.index({ title: "text", description: "text" }); // For text search
PodcastSchema.index({ createdAt: -1 }); // For sorting by creation date

// Pre-save middleware to auto-increment display order for new podcasts
// PodcastSchema.pre('save', async function(this: IPodcast, next) {
//   if (this.isNew && this.displayOrder === 0) {
//     try {
//       const lastPodcast = await this.constructor.findOne({}, {}, { sort: { displayOrder: -1 } });
//       this.displayOrder = lastPodcast ? lastPodcast.displayOrder + 1 : 1;
//     } catch (error) {
//       return next(error as Error);
//     }
//   }
//   next();
// });

// Static method to get active podcasts with pagination
PodcastSchema.statics.getActivePodcasts = function(
  page: number = 1,
  limit: number = 10,
  category?: string,
  search?: string
) {
  const skip = (page - 1) * limit;
  let query: any = { isActive: true };

  // Add category filter if provided
  if (category && category !== 'all') {
    query.category = category;
  }

  // Add search filter if provided
  if (search) {
    query.$text = { $search: search };
  }

  return this.find(query)
    .populate('createdBy', 'fullName email')
    .sort(search ? { score: { $meta: 'textScore' } } : { displayOrder: 1, createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};


// Instance method to toggle active status
PodcastSchema.methods.toggleStatus = function() {
  this.isActive = !this.isActive;
  return this.save();
};

export const Podcast = model<IPodcast, IPodcastModel>("Podcast", PodcastSchema);
