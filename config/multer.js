import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

// Define allowed file extensions
const allowedExtensions = [".jpeg", ".jpg", ".JPEG",".pdf"];
const PROFILE_SIZE = 15 * 1024 * 1024; // Profile size limit in bytes

// Get current directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Multer configuration for file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, "../uploads/profile/");
        fs.access(dir, fs.constants.F_OK, (err) => {
            if (err) {
                // Directory does not exist, show error
                return cb(new Error("Destination directory does not exist"));
            }
            cb(null, dir);
        });
    },
    filename: (req, file, cb) => {
        const timestamp = new Date().getTime();
        const newFileName = `${timestamp}_${file.originalname}`;
        cb(null, newFileName);
    },
});

// File filter function
const fileFilter = (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(extension)) {
        cb(null, true); // Accept the file
    } else {
        cb(new Error('Only JPEG or JPG files are allowed')); // Reject the file with a custom error message
    }
};

const upload = multer({
    storage: storage,

    limits: { fileSize: PROFILE_SIZE }, // Limiting file size to PROFILE_SIZE bytes
    fileFilter: fileFilter,
})

export default upload;
