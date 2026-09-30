import contactModel from "../models/contactModel.js";
import { isValidEmail } from "../utils/validator.js";
import { sendMail } from "../utils/mailer.js";
import env from "../config/env.js";

const STATUSES = ["new", "read", "archived"];

const clean = (value, max) => String(value || "").trim().slice(0, max);

/** Public: anyone can send a message, signed in or not. */
export const submitContactMessage = async (req, res) => {
  const name = clean(req.body.name, 120);
  const email = clean(req.body.email, 200).toLowerCase();
  const subject = clean(req.body.subject, 160);
  const message = clean(req.body.message, 4000);

  if (!name || !subject || !message) {
    return res.status(400).json({
      success: false,
      message: "Please add your name, a subject and a message.",
    });
  }
  if (!isValidEmail(email)) {
    return res
      .status(400)
      .json({ success: false, message: "Please enter a valid email address." });
  }
  if (message.length < 10) {
    return res.status(400).json({
      success: false,
      message: "Please write a little more so we can help.",
    });
  }

  try {
    const saved = await contactModel.create({
      name,
      email,
      subject,
      message,
      userId: req.userId || null,
    });

    // Notify the store owner, but never fail the request if mail is down.
    sendMail({
      to: env.smtp.sender,
      subject: `New Astra enquiry: ${subject}`,
      html: `
        <p style="margin:0 0 12px;"><strong>${name}</strong> &lt;${email}&gt;</p>
        <p style="margin:0 0 12px; white-space:pre-wrap;">${message
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")}</p>
      `,
    });

    return res.status(201).json({
      success: true,
      message: "Thanks — we have your message and will reply shortly.",
      reference: saved._id,
    });
  } catch (error) {
    console.error("Contact message failed:", error);
    return res.status(500).json({
      success: false,
      message: "We could not send that right now. Please try again.",
    });
  }
};

/** Admin inbox. */
export const getContactMessages = async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 20),
    );

    const filter = {};
    if (STATUSES.includes(req.query.status)) {
      filter.status = req.query.status;
    }
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").slice(0, 60);
      const pattern = new RegExp(escaped, "i");
      filter.$or = [{ name: pattern }, { email: pattern }, { subject: pattern }];
    }

    const [messages, total] = await Promise.all([
      contactModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      contactModel.countDocuments(filter),
    ]);

    const unread = await contactModel.countDocuments({ status: "new" });

    return res.status(200).json({
      success: true,
      messages,
      unread,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error("Load contact messages failed:", error);
    return res
      .status(500)
      .json({ success: false, message: "Could not load messages." });
  }
};

export const updateContactMessage = async (req, res) => {
  try {
    const { status } = req.body;
    if (!STATUSES.includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Choose a valid status." });
    }
    const message = await contactModel.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      { new: true, runValidators: true },
    );
    if (!message) {
      return res
        .status(404)
        .json({ success: false, message: "Message not found." });
    }
    return res.status(200).json({ success: true, message: "Message updated." });
  } catch (error) {
    if (error.name === "CastError") {
      return res
        .status(404)
        .json({ success: false, message: "Message not found." });
    }
    console.error("Update contact message failed:", error);
    return res
      .status(500)
      .json({ success: false, message: "Could not update the message." });
  }
};

export const deleteContactMessage = async (req, res) => {
  try {
    const deleted = await contactModel.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: "Message not found." });
    }
    return res.status(200).json({ success: true, message: "Message deleted." });
  } catch (error) {
    console.error("Delete contact message failed:", error);
    return res
      .status(500)
      .json({ success: false, message: "Could not delete the message." });
  }
};
