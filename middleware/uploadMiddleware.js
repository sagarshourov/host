// middleware/uploadMiddleware.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const asyncHandler = require('express-async-handler');

// Ensure upload directories exist
const ensureUploadDirs = () => {
  const dirs = [
    'uploads/reports',
    'uploads/properties',
    'uploads/avatars',
    'uploads/documents',
    'uploads/temp'
  ];

  dirs.forEach(dir => {
    const fullPath = path.join(__dirname, '..', dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`Created upload directory: ${fullPath}`);
    }
  });
};

// Initialize directories
ensureUploadDirs();

// Configure storage for inspection reports
const reportStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const destPath = path.join(__dirname, '..', 'uploads/reports');
    cb(null, destPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-randomString-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 50); // Limit name length
    cb(null, `report_${uniqueSuffix}_${name}${ext}`);
  }
});

// Configure storage for property images
const propertyStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const destPath = path.join(__dirname, '..', 'uploads/properties');
    cb(null, destPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `property_${uniqueSuffix}${ext}`);
  }
});

// Configure storage for avatars
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const destPath = path.join(__dirname, '..', 'uploads/avatars');
    cb(null, destPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const userId = req.user?.id || 'unknown';
    cb(null, `avatar_${userId}_${uniqueSuffix}${ext}`);
  }
});

// Configure storage for general documents
const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const destPath = path.join(__dirname, '..', 'uploads/documents');
    cb(null, destPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 50);
    cb(null, `doc_${uniqueSuffix}_${name}${ext}`);
  }
});

// Configure storage for temporary files
const tempStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const destPath = path.join(__dirname, '..', 'uploads/temp');
    cb(null, destPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `temp_${uniqueSuffix}${ext}`);
  }
});

// File filter for documents and reports
const fileFilter = (req, file, cb) => {
  const allowedMimes = {
    // Images
    'image/jpeg': true,
    'image/jpg': true,
    'image/png': true,
    'image/gif': true,
    'image/webp': true,
    'image/svg+xml': true,
    
    // Documents
    'application/pdf': true,
    'application/msword': true,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': true, // .docx
    'application/vnd.ms-excel': true,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': true, // .xlsx
    'application/vnd.ms-powerpoint': true,
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': true, // .pptx
    
    // Text files
    'text/plain': true,
    'text/csv': true,
    
    // Archives
    'application/zip': true,
    'application/x-rar-compressed': true
  };

  if (allowedMimes[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Only images, documents, and archives are allowed.`), false);
  }
};

// File filter for images only
const imageFilter = (req, file, cb) => {
  const allowedImageTypes = {
    'image/jpeg': true,
    'image/jpg': true,
    'image/png': true,
    'image/gif': true,
    'image/webp': true,
    'image/svg+xml': true
  };

  if (allowedImageTypes[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, GIF, WebP, SVG) are allowed'), false);
  }
};

// File filter for documents only (no images)
const documentFilter = (req, file, cb) => {
  const allowedDocumentTypes = {
    'application/pdf': true,
    'application/msword': true,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': true,
    'application/vnd.ms-excel': true,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': true,
    'application/vnd.ms-powerpoint': true,
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': true,
    'text/plain': true,
    'text/csv': true,
    'application/zip': true,
    'application/x-rar-compressed': true
  };

  if (allowedDocumentTypes[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error('Only document files (PDF, Word, Excel, PowerPoint, text files) are allowed'), false);
  }
};

// File filter for reports (documents + images)
const reportFilter = (req, file, cb) => {
  const allowedReportTypes = {
    // Documents
    'application/pdf': true,
    'application/msword': true,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': true,
    
    // Images for report attachments
    'image/jpeg': true,
    'image/jpg': true,
    'image/png': true,
    'image/gif': true
  };

  if (allowedReportTypes[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, Word documents, and images are allowed for reports'), false);
  }
};

// Configure multer instances
const upload = multer({
  storage: documentStorage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Maximum 10 files
  }
});

const uploadReport = multer({
  storage: reportStorage,
  fileFilter: reportFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1 // Single file for reports
  }
});

const uploadPropertyImages = multer({
  storage: propertyStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per image
    files: 20 // Maximum 20 property images
  }
});

const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit for avatars
    files: 1 // Single file for avatar
  }
});

const uploadDocuments = multer({
  storage: documentStorage,
  fileFilter: documentFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Maximum 10 documents
  }
});

const uploadTemp = multer({
  storage: tempStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for temp files
    files: 5
  }
});

const uploadMultiple = multer({
  storage: documentStorage,
  fileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit
    files: 15 // Maximum 15 files
  }
});

// Error handling middleware for multer
const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    let message = 'File upload error';

    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File too large. Please upload a smaller file.';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files. Please upload fewer files.';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected field name for file upload.';
        break;
      case 'LIMIT_PART_COUNT':
        message = 'Too many parts in the upload.';
        break;
      case 'LIMIT_FIELD_KEY':
        message = 'Field name too long.';
        break;
      case 'LIMIT_FIELD_VALUE':
        message = 'Field value too long.';
        break;
      case 'LIMIT_FIELD_COUNT':
        message = 'Too many fields in the form.';
        break;
      default:
        message = `Upload error: ${err.code}`;
    }

    return res.status(400).json({
      success: false,
      message,
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  } else if (err) {
    // Custom error from fileFilter or other middleware
    return res.status(400).json({
      success: false,
      message: err.message,
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
  next();
};

// Utility function to delete uploaded files
const deleteUploadedFile = (filePath) => {
  return new Promise((resolve, reject) => {
    // Handle both relative and absolute paths
    const fullPath = filePath.startsWith('uploads/') 
      ? path.join(__dirname, '..', filePath)
      : filePath;

    fs.unlink(fullPath, (err) => {
      if (err) {
        if (err.code === 'ENOENT') {
          // File doesn't exist, which is fine
          resolve(false);
        } else {
          console.error('Error deleting file:', err);
          reject(err);
        }
      } else {
        console.log('Successfully deleted file:', fullPath);
        resolve(true);
      }
    });
  });
};

// Utility function to delete multiple files
const deleteUploadedFiles = async (filePaths) => {
  const results = await Promise.allSettled(
    filePaths.map(filePath => deleteUploadedFile(filePath))
  );
  
  const deleted = results.filter(result => result.status === 'fulfilled' && result.value).length;
  const errors = results.filter(result => result.status === 'rejected').length;
  
  return { deleted, errors };
};

// Utility function to validate file type
const validateFileType = (file, allowedTypes) => {
  return allowedTypes.includes(file.mimetype);
};

// Utility function to get file extension
const getFileExtension = (filename) => {
  return path.extname(filename).toLowerCase();
};

// Utility function to get file size in human readable format
const getFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Utility function to check if file exists
const fileExists = (filePath) => {
  const fullPath = filePath.startsWith('uploads/') 
    ? path.join(__dirname, '..', filePath)
    : filePath;
  
  return fs.existsSync(fullPath);
};

// Utility function to get file information
const getFileInfo = (filePath) => {
  const fullPath = filePath.startsWith('uploads/') 
    ? path.join(__dirname, '..', filePath)
    : filePath;
  
  try {
    const stats = fs.statSync(fullPath);
    return {
      exists: true,
      size: stats.size,
      sizeFormatted: getFileSize(stats.size),
      modified: stats.mtime,
      created: stats.birthtime
    };
  } catch (error) {
    return {
      exists: false,
      error: error.message
    };
  }
};

// Middleware to clean up temp files after request
const cleanupTempFiles = asyncHandler(async (req, res, next) => {
  // Store original send function
  const originalSend = res.send;

  // Override send function to clean up files after response
  res.send = function(data) {
    // Clean up temp files if they exist
    if (req.tempFiles && Array.isArray(req.tempFiles)) {
      req.tempFiles.forEach(filePath => {
        deleteUploadedFile(filePath).catch(console.error);
      });
    }

    // Call original send
    originalSend.call(this, data);
  };

  next();
});

// Middleware to process uploaded files and add to request
const processUploadedFiles = asyncHandler(async (req, res, next) => {
  if (!req.files && !req.file) {
    return next();
  }

  const files = req.files || [req.file];
  const processedFiles = [];

  for (const file of files) {
    if (file) {
      const fileInfo = {
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        sizeFormatted: getFileSize(file.size),
        path: file.path,
        relativePath: `uploads/${file.destination.split('uploads/')[1]}/${file.filename}`,
        extension: getFileExtension(file.originalname),
        uploadedAt: new Date()
      };

      processedFiles.push(fileInfo);
    }
  }

  req.uploadedFiles = processedFiles;
  
  // For single file, also set req.uploadedFile for convenience
  if (processedFiles.length === 1) {
    req.uploadedFile = processedFiles[0];
  }

  next();
});

// Export all middleware and utilities
module.exports = {
  // Multer upload instances
  upload, // General upload (multiple files, various types)
  uploadReport, // Single report file
  uploadPropertyImages, // Multiple property images
  uploadAvatar, // Single avatar image
  uploadDocuments, // Multiple documents
  uploadTemp, // Temporary files
  uploadMultiple, // Multiple files with higher limits
  
  // Middleware
  handleUploadErrors,
  cleanupTempFiles,
  processUploadedFiles,
  
  // Utility functions
  deleteUploadedFile,
  deleteUploadedFiles,
  validateFileType,
  getFileExtension,
  getFileSize,
  fileExists,
  getFileInfo,
  
  // File filters (for external use if needed)
  fileFilter,
  imageFilter,
  documentFilter,
  reportFilter,
  
  // Constants
  allowedMimeTypes: {
    images: [
      'image/jpeg', 
      'image/jpg', 
      'image/png', 
      'image/gif', 
      'image/webp', 
      'image/svg+xml'
    ],
    documents: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv'
    ],
    reports: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif'
    ]
  }
};