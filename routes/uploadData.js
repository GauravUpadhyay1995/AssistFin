import express from 'express';
import multer from 'multer';
import * as uploadController from '../controllers/uploadController.js';
import * as clientController from '../controllers/clientFinderController.js';
import path from 'path';
import { fileURLToPath } from 'url';
import authMiddleware from '../middlewares/tokenAuth.js';


// Fix for __dirname in ES module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Set storage engine
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../uploads/'));
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

// Initialize upload
const upload = multer({
    storage: storage,
    limits: { fileSize: 2 * 10000000 } // 10 MB limit
}).single('file');

// Handle file upload
router.post('/uploadMasterData', [upload, authMiddleware], uploadController.handleUpload);
router.post('/uploadUnpaidFileData', [upload, authMiddleware], uploadController.uploadUnpaidFileData);
//Handle Client Upload
router.post('/uploadClientFinder', [upload, authMiddleware], clientController.uploadClientFinder);



export default router;
