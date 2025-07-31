import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { sendEmail } from "@/utils/sendEmail";
import { contactFormSchema } from "@/validators/contactFormSchema";

/**
 * @desc    إرسال رسالة من نموذج اتصل بنا
 * @route   POST /api/contact
 * @access  Public
 */
export const sendContactForm = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const result = contactFormSchema.safeParse(req.body);

      if (!result.success) {
        res.status(400).json({
          status: "error",
          message: "بيانات غير صالحة",
          errors: result.error.flatten().fieldErrors,
        });
        return;
      }

      const { name, email, subject, message } = result.data;

      const htmlContent = `
        <html>
          <head>
            <style>
              body {
                font-family: 'Arial', sans-serif;
                line-height: 1.6;
                color: #333;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                border: 1px solid #ddd;
                border-radius: 5px;
              }
              .header {
                background-color: #f5f5f5;
                padding: 10px;
                border-radius: 5px;
                margin-bottom: 20px;
              }
              .content {
                padding: 0 10px;
              }
              .footer {
                margin-top: 30px;
                font-size: 12px;
                color: #777;
                border-top: 1px solid #ddd;
                padding-top: 10px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2>رسالة جديدة من فورم التواصل</h2>
              </div>
              <div class="content">
                <p><strong>الاسم:</strong> ${name}</p>
                <p><strong>البريد الإلكتروني:</strong> ${email}</p>
                <p><strong>الموضوع:</strong> ${subject}</p>
                <p><strong>الرسالة:</strong></p>
                <p>${message.replace(/\n/g, "<br>")}</p>
              </div>
              <div class="footer">
                <p>تم إرسال هذه الرسالة من نموذج الاتصال في الموقع.</p>
              </div>
            </div>
          </body>
        </html>
      `;

      const adminEmail = process.env.EMAIL;
      await sendEmail(
        adminEmail!,
        `رسالة اتصال جديدة: ${subject}`,
        htmlContent
      );

      const userConfirmation = `
        <html>
          <head>
            <style>
              body {
                font-family: 'Arial', sans-serif;
                line-height: 1.6;
                color: #333;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                border: 1px solid #ddd;
                border-radius: 5px;
              }
              .header {
                background-color: #f5f5f5;
                padding: 10px;
                border-radius: 5px;
                margin-bottom: 20px;
              }
              .content {
                padding: 0 10px;
              }
              .footer {
                margin-top: 30px;
                font-size: 12px;
                color: #777;
                border-top: 1px solid #ddd;
                padding-top: 10px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2>شكراً لتواصلك معنا</h2>
              </div>
              <div class="content">
                <p>مرحباً ${name}،</p>
                <p>لقد استلمنا رسالتك وسنقوم بالرد عليها في أقرب وقت ممكن.</p>
                <p>موضوع الرسالة: ${subject}</p>
              </div>
              <div class="footer">
                <p>هذه رسالة آلية، يرجى عدم الرد عليها.</p>
              </div>
            </div>
          </body>
        </html>
      `;

      await sendEmail(email, "شكراً لتواصلك معنا", userConfirmation);

      res.status(200).json({
        status: "success",
        message: "تم إرسال الرسالة بنجاح",
      });
    } catch (error) {
      console.error("خطأ في إرسال نموذج الاتصال:", error);
      res.status(500).json({
        status: "error",
        message: "حدث خطأ أثناء إرسال الرسالة",
      });
    }
  }
);
