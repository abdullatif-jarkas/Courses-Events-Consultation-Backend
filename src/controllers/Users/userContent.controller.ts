import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { RecordedCourseBooking } from "@/models/recordedCourseBooking.model";
import { ConsultationBooking } from "@/models/consultations/consultaionBooking.model";
import { InPersonCourseBooking } from "@/models/courses/inPersonCourseBooking.model";

interface PopulatedRecordedCourseBooking extends Document {
  _id: string;
  courseId: {
    _id: string;
    title: string;
    description: string;
    image: string;
    duration: number;
    price: number;
    type: string;
  };
  recordedCourseId: {
    _id: string;
    files: {
      fileName: string;
      fileUrl: string;
      fileType: string;
    }[];
  };
  createdAt: Date;
}

/**
 * @desc    الحصول على جميع محتويات المستخدم (كورسات مسجلة، كورسات حضورية، استشارات)
 * @route   GET /api/user-content
 * @access  Private
 */
export const getUserContent = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    // الحصول على جميع الكورسات المسجلة
    const recordedCourseBookings = (await RecordedCourseBooking.find({
      userId,
      paymentStatus: "paid",
    })
      .populate({
        path: "courseId",
        select: "title description image duration price type",
      })
      .populate({
        path: "recordedCourseId",
        select: "files",
      })
      .sort({ createdAt: -1 })) as unknown as PopulatedRecordedCourseBooking[];

    // الحصول على جميع الكورسات الحضورية
    const inPersonCourseBookings = await InPersonCourseBooking.find({
      userId,
      paymentStatus: "paid",
    })
      .populate("courseId", "title description image duration price type")
      .populate("inPersonCourseId", "startDate endDate location")
      .sort({ createdAt: -1 });

    // الحصول على جميع الاستشارات
    const consultationBookings = await ConsultationBooking.find({
      userId,
      paymentStatus: "paid",
    })
      .populate({
        path: "consultationId",
        select:
          "consultationType scheduledAt price duration location notes meetingLink",
      })
      .sort({ createdAt: -1 });

    // تنسيق الكورسات المسجلة
    const recordedCourses = recordedCourseBookings.map((booking) => {
      const course = booking.courseId;
      const recordedCourse = booking.recordedCourseId;

      return {
        id: booking._id,
        courseId: booking.courseId,
        recordedCourseId: booking.recordedCourseId,
        title: course.title,
        description: course.description,
        image: course.image,
        duration: course.duration,
        price: course.price,
        contentType: "recorded-course",
        purchaseDate: booking.createdAt,
        // معلومات إضافية خاصة بالكورسات المسجلة
        filesCount: recordedCourse.files.length,
        hasAccess: true,
      };
    });

    // تنسيق الكورسات الحضورية
    const inPersonCourses = inPersonCourseBookings.map((booking) => {
      const course = booking.courseId;
      // const inPersonCourse = booking.inPersonCourseId;

      return {
        id: booking._id,
        // courseId: course._id,
        // inPersonCourseId: inPersonCourse._id,
        // title: course.title,
        // description: course.description,
        // image: course.image,
        // duration: course.duration,
        // price: course.price,
        contentType: "in-person-course",
        // purchaseDate: booking.createdAt,
        // معلومات إضافية خاصة بالكورسات الحضورية
        // startDate: inPersonCourse.startDate,
        // endDate: inPersonCourse.endDate,
        // location: inPersonCourse.location,
        hasAccess: true,
      };
    });

    // تنسيق الاستشارات
    const consultations = consultationBookings.map((booking) => {
      const consultation = booking.consultationId;

      return {
        id: booking._id,
        consultationId: consultation._id,
        // title: `استشارة: ${consultation.consultationType}`,
        contentType: "consultation",
        purchaseDate: booking.createdAt,
        // معلومات إضافية خاصة بالاستشارات
        // scheduledAt: consultation.scheduledAt,
        // duration: consultation.duration,
        // price: consultation.price,
        // location: consultation.location,
        // meetingLink: consultation.meetingLink,
        hasAccess: true,
      };
    });

    // دمج جميع المحتويات في مصفوفة واحدة
    const allContent = [
      ...recordedCourses,
      ...inPersonCourses,
      ...consultations,
    ];

    // ترتيب المحتوى حسب تاريخ الشراء (الأحدث أولاً)
    // allContent.sort((a, b) => {
    //   return new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime();
    // });

    // إحصائيات سريعة
    const stats = {
      totalItems: allContent.length,
      recordedCourses: recordedCourses.length,
      inPersonCourses: inPersonCourses.length,
      consultations: consultations.length,
    };

    res.status(200).json({
      status: "success",
      stats,
      data: allContent,
    });
  }
);
