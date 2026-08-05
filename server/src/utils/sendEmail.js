import nodemailer from 'nodemailer';

export const sendEmail = async (options) => {
  const smtpConfigured = process.env.SMTP_USER && process.env.SMTP_PASS;

  if (!smtpConfigured) {
    // Mock mode — log OTP to console so it's visible in Render logs during development/testing
    console.log(`\n========== [MOCK EMAIL — SMTP NOT CONFIGURED] ==========`);
    console.log(`To      : ${options.email}`);
    console.log(`Subject : ${options.subject}`);
    console.log(`Message : ${options.message}`);
    console.log(`=========================================================\n`);
    return; // Exit cleanly — don't throw, OTP is in DB and visible in logs
  }

  // Real email mode
  try {
    const transporter = nodemailer.createTransport({
      service: process.env.SMTP_SERVICE || 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: `"MessConnect" <${process.env.SMTP_USER}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
    };

    await transporter.sendMail(mailOptions);
    console.log(`[REAL EMAIL] Sent successfully to ${options.email}`);
  } catch (error) {
    // Log the full error so it appears in Render logs
    console.error(`[EMAIL ERROR] Failed to send to ${options.email}:`, error.message);
    throw error; // Re-throw so caller returns 500 instead of silently succeeding
  }
};
