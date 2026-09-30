import transporter from "../config/nodemailer.js";
import env from "../config/env.js";

/**
 * Outbound mail that never throws.
 *
 * A provider outage (or an IP that the provider refuses) must not take down
 * account creation or leak SMTP internals to the browser, so delivery problems
 * are logged and reported back to the caller instead.
 */
export const isMailConfigured = () =>
  Boolean(
    env.smtp.host && env.smtp.user && env.smtp.pass && env.smtp.sender,
  );

export const sendMail = async ({ to, subject, html }) => {
  if (!isMailConfigured()) {
    console.warn(`[mail] skipped "${subject}" — SMTP is not configured`);
    return { sent: false, reason: "not-configured" };
  }
  try {
    await transporter.sendMail({ from: env.smtp.sender, to, subject, html });
    return { sent: true };
  } catch (error) {
    console.error(
      `[mail] could not send "${subject}" to ${to}:`,
      error.message,
    );
    return { sent: false, reason: error.message };
  }
};

export default sendMail;
