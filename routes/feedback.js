const express = require("express");
const nodemailer = require("nodemailer");

const router = express.Router();

// ✅ POST: Submit feedback
router.post("/submit", async (req, res) => {
  try {
    const { rating, comment, name, email } = req.body;

    if (!rating || !comment) {
      return res.status(400).json({ success: false, message: "Rating and comment are required" });
    }

    // Create mail transporter
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER, // your Gmail
        pass: process.env.EMAIL_PASS, // your Gmail App Password
      },
    });

    // Build feedback HTML template
    const feedbackHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; background: #f8fafc;">
        <h2 style="color: #16a34a;">🌟 New Feedback Received</h2>
        
        <table style="border-collapse: collapse; width: 100%; max-width: 600px; margin-top: 20px;">
          <tr>
            <td style="padding: 10px; font-weight: bold; border: 1px solid #e5e7eb;">Rating</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">
              ${"★".repeat(rating)}${"☆".repeat(5 - rating)}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px; font-weight: bold; border: 1px solid #e5e7eb;">Comment</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">${comment}</td>
          </tr>
          <tr>
            <td style="padding: 10px; font-weight: bold; border: 1px solid #e5e7eb;">Name</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">${name || "N/A"}</td>
          </tr>
          <tr>
            <td style="padding: 10px; font-weight: bold; border: 1px solid #e5e7eb;">Email</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">${email || "N/A"}</td>
          </tr>
        </table>

        <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">
          Sent automatically from ElectricQ Feedback System 🚀
        </p>
      </div>
    `;

    // Send email
    await transporter.sendMail({
      from: `"ElectricQ Feedback" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // receiver email
      subject: "📩 New Feedback Submission - ElectricQ",
      html: feedbackHtml,
    });

    return res.status(200).json({
      success: true,
      message: "Feedback submitted and email sent successfully",
    });
  } catch (error) {
    console.error("Feedback submission error:", error);
    return res.status(500).json({
      success: false,
      message: "Error submitting feedback",
      error: error.message,
    });
  }
});

module.exports = router;
