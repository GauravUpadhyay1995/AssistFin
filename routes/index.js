import express from "express";
import * as userController from "../controllers/userController.js";
import authMiddleware from '../middlewares/tokenAuth.js';
import upload from "../config/multer.js";
const cpUpload = upload.fields([{ name: 'file', maxCount: 1 }])
const cpUpload1 = upload.fields([
    { name: 'Profile', maxCount: 1 },
    { name: 'Pan', maxCount: 1 },
    { name: 'Adhaar', maxCount: 1 },
    { name: 'PoliceVerification', maxCount: 1 },
    { name: 'DRA', maxCount: 1 },
])

const route = express.Router();
route.post("/userRegister", [cpUpload1, authMiddleware], userController.userRegister);
route.post("/userLogin", userController.userLogin);
route.post("/UpdateUserProfile", [cpUpload, authMiddleware], userController.UpdateUserProfile);
route.post("/deleteUser", [authMiddleware], userController.deleteUser);
route.post("/getAgents", [authMiddleware], userController.getAgents);
route.post("/getEmployees", [authMiddleware], userController.getEmployees);
route.post("/getNBFC", [authMiddleware], userController.getNBFC);
route.post("/getUserProfile", [authMiddleware], userController.getUserProfile);
route.post("/testing", [cpUpload1], userController.testing);





export default route;
