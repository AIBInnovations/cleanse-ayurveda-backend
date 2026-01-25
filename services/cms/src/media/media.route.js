import express from "express";
import multer from "multer";
import { validate } from "@shared/middlewares";
import mediaController from "./media.controller.js";
import {
  uploadSingleSchema,
  uploadMultipleSchema,
  updateMediaSchema,
  getMediaByIdSchema,
  bulkDeleteSchema,
  adminListQuerySchema,
  MAX_FILE_SIZE,
} from "./media.validator.js";

const adminRouter = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10,
  },
});

// ============================================================
// ADMIN ROUTES (Protected - No public access)
// ============================================================

// GET /admin/media - List all media files
adminRouter.get("/", validate(adminListQuerySchema), mediaController.listAllMedia);

// GET /admin/media/folders - Get list of unique folders (before :id route)
adminRouter.get("/folders", mediaController.listFolders);

// POST /admin/media/upload - Upload single file
adminRouter.post(
  "/upload",
  upload.single("file"),
  validate(uploadSingleSchema),
  mediaController.uploadSingle
);

// POST /admin/media/upload-multiple - Upload multiple files
adminRouter.post(
  "/upload-multiple",
  upload.array("files", 10),
  validate(uploadMultipleSchema),
  mediaController.uploadMultiple
);

// DELETE /admin/media/bulk - Bulk delete media files (before :id route)
adminRouter.delete("/bulk", validate(bulkDeleteSchema), mediaController.bulkDeleteMedia);

// GET /admin/media/:id - Get media file by ID
adminRouter.get("/:id", validate(getMediaByIdSchema), mediaController.getMediaById);

// PUT /admin/media/:id - Update media metadata
adminRouter.put("/:id", validate(updateMediaSchema), mediaController.updateMedia);

// DELETE /admin/media/:id - Delete media file
adminRouter.delete("/:id", validate(getMediaByIdSchema), mediaController.deleteMedia);

// Media is admin-only, no consumer routes
export default {
  admin: adminRouter,
};
