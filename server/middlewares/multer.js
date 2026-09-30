import multer from "multer";
import env from "../config/env.js";

export const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: env.maxUploadBytes, files: 10 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype?.startsWith("image/")) {
      cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname));
      return;
    }
    cb(null, true);
  },
});

export const singleUpload = upload.single("file");
export const multipleUpload = upload.array("files", 10);
