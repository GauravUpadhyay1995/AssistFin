import express from "express";
import * as userController from "../controllers/userController.js";
import authMiddleware from '../middlewares/tokenAuth.js';
import upload from "../config/multer.js";
const cpUpload = upload.fields([{ name: 'file', maxCount: 1 }])

const route = express.Router();
route.post("/userRegister", authMiddleware, userController.userRegister);
route.post("/userLogin", userController.userLogin);
route.post("/UpdateUserProfile", [cpUpload, authMiddleware], userController.UpdateUserProfile);
route.post("/deleteUser", [authMiddleware], userController.deleteUser);
route.post("/getAgents", [authMiddleware], userController.getAgents);
route.post("/getEmployees", [authMiddleware], userController.getEmployees);
route.post("/getNBFC", [authMiddleware], userController.getNBFC);
route.post("/getUserProfile", [authMiddleware], userController.getUserProfile);





export default route;
