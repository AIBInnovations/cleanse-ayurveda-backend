import { sendResponse, HTTP_STATUS } from "@shared/utils";
import { uploadMedia, deleteMedia as deleteCloudinaryMedia } from "@shared/cloudinary";
import Media from "../../models/media.model.js";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from "./media.validator.js";

// Helper: Validate file type
const validateFileType = (mimetype) => {
  return ALLOWED_MIME_TYPES.includes(mimetype);
};

// Helper: Validate file size
const validateFileSize = (size) => {
  return size <= MAX_FILE_SIZE;
};

// Helper: Get media type from mimetype
const getMediaType = (mimetype) => {
  if (mimetype.startsWith("image/")) return "image";
  return "document";
};

// Helper: Generate thumbnail URL for images (Cloudinary transformation)
const generateThumbnailUrl = (url, mimetype) => {
  if (!mimetype.startsWith("image/")) return null;

  // Cloudinary transformation for thumbnails
  if (url.includes("cloudinary.com")) {
    return url.replace("/upload/", "/upload/c_thumb,w_200,h_200/");
  }
  return url;
};

// ============================================================
// ADMIN CONTROLLERS
// ============================================================

// GET /admin/media - List all media files
const listAllMedia = async (req, res) => {
  console.log("listAllMedia called with query:", req.query);

  const { folder, type, mime_type, search, page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  const query = {};

  if (folder) {
    query.folder = folder;
  }

  if (type === "image") {
    query.mime_type = { $regex: "^image/" };
  } else if (type === "document") {
    query.mime_type = { $not: { $regex: "^image/" } };
  }

  if (mime_type) {
    query.mime_type = mime_type;
  }

  if (search) {
    query.$or = [
      { filename: { $regex: search, $options: "i" } },
      { alt_text: { $regex: search, $options: "i" } },
    ];
  }

  const [media, total] = await Promise.all([
    Media.find(query).sort({ created_at: -1 }).skip(skip).limit(limit).lean(),
    Media.countDocuments(query),
  ]);

  return sendResponse(res, HTTP_STATUS.OK, "Media files retrieved successfully", {
    media,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
};

// GET /admin/media/:id - Get media file by ID
const getMediaById = async (req, res) => {
  console.log("getMediaById called with id:", req.params.id);

  const media = await Media.findById(req.params.id).lean();

  if (!media) {
    return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Media file not found");
  }

  return sendResponse(res, HTTP_STATUS.OK, "Media file retrieved successfully", media);
};

// POST /admin/media/upload - Upload single file
const uploadSingle = async (req, res) => {
  console.log("uploadSingle called");

  const file = req.file;
  if (!file) {
    return sendResponse(res, HTTP_STATUS.BAD_REQUEST, "No file provided");
  }

  // Validate file type
  if (!validateFileType(file.mimetype)) {
    return sendResponse(res, HTTP_STATUS.BAD_REQUEST, "File type not allowed");
  }

  // Validate file size
  if (!validateFileSize(file.size)) {
    return sendResponse(res, HTTP_STATUS.BAD_REQUEST, "File size exceeds 10MB limit");
  }

  const { folder = "general", alt_text } = req.body;
  const adminId = req.headers["x-admin-id"];

  // Upload to Cloudinary
  const cloudinaryResult = await uploadMedia(file.buffer, {
    folder: `cms/${folder}`,
    resource_type: "auto",
  });

  // Create media record
  const mediaData = {
    filename: file.originalname,
    url: cloudinaryResult.secure_url,
    public_id: cloudinaryResult.public_id,
    thumbnail_url: generateThumbnailUrl(cloudinaryResult.secure_url, file.mimetype),
    mime_type: file.mimetype,
    file_size: file.size,
    alt_text: alt_text || null,
    folder,
    uploaded_by_id: adminId || null,
  };

  const media = await Media.create(mediaData);

  return sendResponse(res, HTTP_STATUS.CREATED, "File uploaded successfully", media.toObject());
};

// POST /admin/media/upload-multiple - Upload multiple files
const uploadMultiple = async (req, res) => {
  console.log("uploadMultiple called");

  const files = req.files;
  if (!files || files.length === 0) {
    return sendResponse(res, HTTP_STATUS.BAD_REQUEST, "No files provided");
  }

  if (files.length > 10) {
    return sendResponse(res, HTTP_STATUS.BAD_REQUEST, "Cannot upload more than 10 files at once");
  }

  const { folder = "general" } = req.body;
  const adminId = req.headers["x-admin-id"];

  const results = {
    success: [],
    failed: [],
  };

  for (const file of files) {
    // Validate file type
    if (!validateFileType(file.mimetype)) {
      results.failed.push({ filename: file.originalname, error: "File type not allowed" });
      continue;
    }

    // Validate file size
    if (!validateFileSize(file.size)) {
      results.failed.push({ filename: file.originalname, error: "File size exceeds 10MB limit" });
      continue;
    }

    try {
      // Upload to Cloudinary
      const cloudinaryResult = await uploadMedia(file.buffer, {
        folder: `cms/${folder}`,
        resource_type: "auto",
      });

      // Create media record
      const mediaData = {
        filename: file.originalname,
        url: cloudinaryResult.secure_url,
        public_id: cloudinaryResult.public_id,
        thumbnail_url: generateThumbnailUrl(cloudinaryResult.secure_url, file.mimetype),
        mime_type: file.mimetype,
        file_size: file.size,
        folder,
        uploaded_by_id: adminId || null,
      };

      const media = await Media.create(mediaData);
      results.success.push(media.toObject());
    } catch (error) {
      console.log("Error uploading file:", file.originalname, error.message);
      results.failed.push({ filename: file.originalname, error: error.message });
    }
  }

  return sendResponse(res, HTTP_STATUS.OK, "Files processed", results);
};

// PUT /admin/media/:id - Update media metadata
const updateMedia = async (req, res) => {
  console.log("updateMedia called with id:", req.params.id, "body:", req.body);

  const media = await Media.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).lean();

  if (!media) {
    return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Media file not found");
  }

  return sendResponse(res, HTTP_STATUS.OK, "Media file updated successfully", media);
};

// DELETE /admin/media/:id - Delete media file
const deleteMedia = async (req, res) => {
  console.log("deleteMedia called with id:", req.params.id);

  const media = await Media.findById(req.params.id);

  if (!media) {
    return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Media file not found");
  }

  // Delete from Cloudinary if public_id exists
  if (media.public_id) {
    try {
      await deleteCloudinaryMedia(media.public_id);
    } catch (error) {
      console.log("Error deleting from Cloudinary:", error.message);
    }
  }

  await Media.findByIdAndDelete(req.params.id);

  return sendResponse(res, HTTP_STATUS.OK, "Media file deleted successfully");
};

// DELETE /admin/media/bulk - Bulk delete media files
const bulkDeleteMedia = async (req, res) => {
  console.log("bulkDeleteMedia called with body:", req.body);

  const { ids } = req.body;

  const results = {
    success: [],
    failed: [],
  };

  const mediaFiles = await Media.find({ _id: { $in: ids } });

  for (const media of mediaFiles) {
    // Delete from Cloudinary if public_id exists
    if (media.public_id) {
      try {
        await deleteCloudinaryMedia(media.public_id);
      } catch (error) {
        console.log("Error deleting from Cloudinary:", error.message);
      }
    }

    try {
      await Media.findByIdAndDelete(media._id);
      results.success.push(media._id.toString());
    } catch (error) {
      results.failed.push({ id: media._id.toString(), error: error.message });
    }
  }

  // Handle IDs not found
  const foundIds = mediaFiles.map((m) => m._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));
  notFoundIds.forEach((id) => {
    results.failed.push({ id, error: "Media file not found" });
  });

  return sendResponse(res, HTTP_STATUS.OK, "Bulk delete processed", results);
};

// GET /admin/media/folders - Get list of unique folders
const listFolders = async (req, res) => {
  console.log("listFolders called");

  const folders = await Media.distinct("folder");
  const sortedFolders = folders.sort();

  return sendResponse(res, HTTP_STATUS.OK, "Folders retrieved successfully", sortedFolders);
};

export default {
  listAllMedia,
  getMediaById,
  uploadSingle,
  uploadMultiple,
  updateMedia,
  deleteMedia,
  bulkDeleteMedia,
  listFolders,
};
