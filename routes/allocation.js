import express from "express";
import * as allocationController from "../controllers/allocationController.js";
import authMiddleware from '../middlewares/tokenAuth.js';
import upload from "../config/multer.js";
const cpUpload = upload.fields([
    { name: 'Profile', maxCount: 1 },
    { name: 'Pan', maxCount: 1 },
    { name: 'Adhaar', maxCount: 1 },
    { name: 'PoliceVerification', maxCount: 1 },
    { name: 'DRA', maxCount: 1 },

])
const route = express.Router();
route.post("/getFilterAllocation", [cpUpload,authMiddleware], allocationController.getFilterAllocation);





export default route;
