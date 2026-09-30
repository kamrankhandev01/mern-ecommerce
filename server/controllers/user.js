import userModel from "../models/userModel.js";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import env from "../config/env.js";
import { sendMail } from "../utils/mailer.js";
import { isStrongPassword } from "../utils/validator.js";
import { isValidEmail } from "../utils/validator.js";
import cloudinary from "../config/cloudinary.js";

/** Session cookie settings shared by register, login and logout. */
const sessionCookieOptions = () => ({
  httpOnly: true,
  sameSite: env.cookieSameSite,
  secure: env.cookieSecure,
  maxAge: 24 * 60 * 60 * 1000,
});

const toPublicUser = (user) => {
  const publicUser = user.toObject();
  for (const field of [
    "password",
    "otp",
    "otpExp",
    "resetOtp",
    "resetOtpExp",
  ]) {
    delete publicUser[field];
  }
  return publicUser;
};

const escapeHtml = (value = "") =>
  String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });

const emailTemplate = (title, preview, content) => `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="x-apple-disable-message-reformatting" />
      <title>${title}</title>
      <style>
        body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
        table { border-spacing: 0; }
        @media only screen and (max-width: 620px) {
          .email-outer { padding: 16px 10px !important; }
          .email-shell { width: 100% !important; }
          .email-gutter { padding-left: 22px !important; padding-right: 22px !important; }
          .email-heading { font-size: 24px !important; line-height: 1.25 !important; }
          .email-code { font-size: 28px !important; letter-spacing: 6px !important; }
        }
      </style>
    </head>
    <body style="margin:0; padding:0; background:#f2f2ee; font-family:Arial, Helvetica, sans-serif;">
      <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">${preview}</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; background:#f2f2ee;">
        <tr>
          <td class="email-outer" align="center" style="padding:32px 16px;">
            <table role="presentation" class="email-shell" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%; max-width:600px; background:#ffffff; border:1px solid #e5e5e0;">
              <tr>
                <td class="email-gutter" style="padding:28px 40px; background:#171714; color:#ffffff;">
                  <p style="margin:0 0 16px; color:#f2c96d; font-size:14px; font-weight:bold; letter-spacing:2px; text-transform:uppercase;">Astra</p>
                  <h1 class="email-heading" style="margin:0; color:#ffffff; font-size:30px; line-height:1.2; font-weight:600;">${title}</h1>
                </td>
              </tr>
              <tr>
                <td class="email-gutter" style="padding:32px 40px; color:#30302c; font-size:16px; line-height:1.65;">
                  ${content}
                </td>
              </tr>
              <tr>
                <td class="email-gutter" style="padding:18px 40px; border-top:1px solid #e7e7e1; color:#707068; font-size:12px; line-height:1.6;">
                  Astra will never ask you to share a sign-in or verification code. If you did not request this email, you can safely ignore it.
                </td>
              </tr>
            </table>
            <p style="margin:16px 0 0; color:#85857c; font-size:11px; line-height:1.5; text-align:center;">© 2026 Astra · Thoughtful finds for everyday</p>
          </td>
        </tr>
      </table>
    </body>
  </html>
`;

export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!isValidEmail(email)) {
      throw new Error("Please enter a valid email");
    }
    if (!isStrongPassword(password)) {
      throw new Error("Password is not strong enough");
    }
    const user = await userModel.findOne({ email });
    if (user) {
      throw new Error("User already exists");
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await userModel.create({
      name,
      email,
      password: hashedPassword,
    });

    const mailOptions = {
      from: process.env.SMTP_SENDER_EMAIL,
      to: newUser.email,
      subject: "Welcome to Astra",
      html: emailTemplate(
        "Welcome to Astra",
        "Your Astra account is ready.",
        `
          <p style="margin:0 0 18px;">Hello <strong>${escapeHtml(newUser.name)}</strong>,</p>
          <p style="margin:0 0 18px;">Thank you for joining Astra. We are glad you are here.</p>
          <p style="margin:0 0 24px;">Sign in to explore thoughtful finds for everyday.</p>
          <p style="margin:28px 0;">
            <a href="${escapeHtml(env.clientUrl || "http://localhost:5173")}" style="display:inline-block; padding:13px 22px; background:#171714; color:#ffffff; font-size:14px; font-weight:bold; text-decoration:none;">Visit Astra</a>
          </p>
          <p style="margin:0; color:#707068; font-size:14px;">Questions? Reply to this email and our team will be happy to help.</p>
        `,
      ),
    };

    // A welcome email is a courtesy, never a reason to fail registration.
    await sendMail(mailOptions);

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: env.jwtExpiresIn,
    });
    res.cookie("token", token, sessionCookieOptions());

    res.status(201).json({
      success: true,
      user: toPublicUser(newUser),
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await userModel.findOne({ email });

    if (!user) {
      throw new Error("Invalid credentials");
    }
    const isMatched = await bcrypt.compare(password, user.password);
    if (!isMatched) {
      throw new Error("Invalid credentials");
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: env.jwtExpiresIn,
    });
    res.cookie("token", token, sessionCookieOptions());

    res.status(200).json({
      success: true,
      user: toPublicUser(user),
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const logoutUser = async (req, res) => {
  try {
    res.clearCookie("token", sessionCookieOptions());
    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const sendOtp = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await userModel.findById(userId);

    if (!user) {
      throw new Error("User not found");
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExp = Date.now() + 10 * 60 * 1000; // OTP valid for 10 minutes
    const hashedOtp = await bcrypt.hash(otp, 10);

    // Save OTP and expiration time to user document
    user.otp = hashedOtp;
    user.otpExp = otpExp;
    await user.save();

    const mailOptions = {
      from: process.env.SMTP_SENDER_EMAIL,
      to: user.email,
      subject: "Astra email verification code",
      html: emailTemplate(
        "Verify your email",
        "Your Astra verification code is inside.",
        `
          <p style="margin:0 0 18px;">Hello <strong>${escapeHtml(user.name)}</strong>,</p>
          <p style="margin:0 0 22px;">Enter this one-time code to verify your Astra email address. It expires in 10 minutes.</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; margin:22px 0; background:#f6f5f0; border:1px solid #e7e5dc;">
          <tr><td align="center" style="padding:22px 12px;">
            <p style="margin:0 0 8px; color:#77766e; font-size:11px; font-weight:bold; letter-spacing:1.5px; text-transform:uppercase;">Your verification code</p>
            <p class="email-code" style="margin:0; color:#171714; font-size:32px; font-weight:bold; letter-spacing:8px;">${otp}</p>
          </td></tr>
          </table>
          <p style="margin:0; color:#707068; font-size:14px;">If you did not create an Astra account, you can ignore this message.</p>
        `,
      ),
    };

    const delivery = await sendMail(mailOptions);
    if (!delivery.sent) {
      // Do not leave a code the customer never received.
      user.otp = null;
      user.otpExp = null;
      await user.save();
      return res.status(503).json({
        success: false,
        message: "We could not send the code. Please try again in a moment.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Verification code sent",
    });
  } catch (error) {
    console.error("Send OTP failed:", error);
    return res.status(500).json({
      success: false,
      message: "We could not send the code. Please try again in a moment.",
    });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const userId = req.userId;
    const { otp } = req.body;

    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    const isMatch = await bcrypt.compare(otp, user.otp);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    if (Date.now() > user.otpExp) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired",
      });
    }

    user.isVerified = true;
    user.otp = null;
    user.otpExp = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const resetOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExp = Date.now() + 10 * 60 * 1000; // OTP valid for 10 minutes
    const hashedOtp = await bcrypt.hash(otp, 10);

    user.resetOtp = hashedOtp;
    user.resetOtpExp = otpExp;
    await user.save();

    const mailOptions = {
      from: process.env.SMTP_SENDER_EMAIL,
      to: user.email,
      subject: "Astra password reset code",
      html: emailTemplate(
        "Reset your password",
        "Your Astra password reset code is inside.",
        `
          <p style="margin:0 0 18px;">We received a request to reset the password for your Astra account.</p>
          <p style="margin:0 0 22px;">Enter this one-time code to choose a new password. It expires in 10 minutes.</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; margin:22px 0; background:#f6f5f0; border:1px solid #e7e5dc;">
            <tr><td align="center" style="padding:22px 12px;">
              <p style="margin:0 0 8px; color:#77766e; font-size:11px; font-weight:bold; letter-spacing:1.5px; text-transform:uppercase;">Your reset code</p>
              <p class="email-code" style="margin:0; color:#171714; font-size:32px; font-weight:bold; letter-spacing:8px;">${otp}</p>
            </td></tr>
          </table>
          <p style="margin:0; color:#707068; font-size:14px;">If you did not request a password reset, ignore this email. Your password will remain unchanged.</p>
        `,
      ),
    };

    const delivery = await sendMail(mailOptions);
    if (!delivery.sent) {
      user.resetOtp = null;
      user.resetOtpExp = null;
      await user.save();
      return res.status(503).json({
        success: false,
        message: "We could not send the reset code. Please try again in a moment.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Password reset code sent",
    });
  } catch (error) {
    console.error("Reset OTP failed:", error);
    return res.status(500).json({
      success: false,
      message: "We could not send the reset code. Please try again in a moment.",
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(otp, user.resetOtp);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    if (Date.now() > user.resetOtpExp) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetOtp = null;
    user.resetOtpExp = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { email, name, role } = req.body;
    const loggedInUser = req.user;
    const updateUserId = req.params.id;

    if (
      loggedInUser._id.toString() !== updateUserId &&
      loggedInUser.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only update your own profile.",
      });
    }

    let user = await userModel.findById(updateUserId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    let profileImageUrl = user.profileImage;
    let profileImageId = user.profileImageId;

    if (req.file) {
      if (profileImageId) {
        await cloudinary.uploader.destroy(profileImageId);
      }

      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream({ folder: "profile_images" }, (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          })
          .end(req.file.buffer);
      });

      profileImageUrl = uploadResult.secure_url;
      profileImageId = uploadResult.public_id;
    }

    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (normalizedEmail && normalizedEmail !== user.email) {
      const emailTaken = await userModel.findOne({
        email: normalizedEmail,
        _id: { $ne: user._id },
      });
      if (emailTaken) {
        return res.status(409).json({
          success: false,
          message: "That email address is already in use.",
        });
      }
    }

    user.email = normalizedEmail || user.email;
    user.name = name || user.name;
    user.profileImage = profileImageUrl || user.profileImage;
    user.profileImageId = profileImageId || user.profileImageId;
    if (loggedInUser.role === "admin" && role) user.role = role;
    await user.save();

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      user: toPublicUser(user),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await userModel.find();
    res.status(200).json({
      success: true,
      users: users.map(toPublicUser),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid user id" });
    }
    // A profile is private: you may read your own, admins may read any.
    if (String(req.userId) !== String(id) && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You can only view your own profile.",
      });
    }

    const user = await userModel.findById(id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    return res.status(200).json({
      success: true,
      user: toPublicUser(user),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/** Paginated, searchable customer directory for the admin console. */
export const getUsers = async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 20),
    );

    const filter = {};
    if (["user", "admin"].includes(req.query.role)) {
      filter.role = req.query.role;
    }
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").slice(0, 60);
      const pattern = new RegExp(escaped, "i");
      filter.$or = [{ name: pattern }, { email: pattern }];
    }

    const [users, total] = await Promise.all([
      userModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      userModel.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      users: users.map(toPublicUser),
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/** Promote or demote a customer. Admins cannot change their own role. */
export const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!["user", "admin"].includes(role)) {
      return res
        .status(400)
        .json({ success: false, message: "Choose a valid role." });
    }
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid user id" });
    }
    if (String(id) === String(req.userId)) {
      return res.status(409).json({
        success: false,
        message: "You cannot change your own role.",
      });
    }

    const user = await userModel.findById(id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    if (user.role === "admin" && role === "user") {
      const adminCount = await userModel.countDocuments({ role: "admin" });
      if (adminCount <= 1) {
        return res.status(409).json({
          success: false,
          message: "At least one administrator must remain.",
        });
      }
    }

    user.role = role;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `${user.email} is now ${role === "admin" ? "an administrator" : "a customer"}.`,
      user: toPublicUser(user),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
