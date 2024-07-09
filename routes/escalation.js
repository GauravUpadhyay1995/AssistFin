import express from "express";
import * as userController from "../controllers/escalationController.js";
import authMiddleware from '../middlewares/tokenAuth.js';
import upload from "../config/multer.js";
const cpUpload = upload.fields([
    { name: 'attachment', maxCount: 1 },
])
const route = express.Router();
route.post("/openedEscalationForNBFC", [authMiddleware], userController.openedEscalationForNBFC);

route.post("/getEscalationByAgencyId", [authMiddleware], userController.getEscalationByAgencyId);

route.post("/raiseEscalation", [cpUpload, authMiddleware], userController.raiseEscalation);
route.post("/replyEscalation", [cpUpload, authMiddleware], userController.replyEscalation);
route.post("/closeEscalation", [authMiddleware], userController.closeEscalation);

route.post("/getClosedEscalationById", [authMiddleware], userController.getClosedEscalationById);
route.post("/escalationWaiverRequest", [authMiddleware], userController.escalationWaiverRequest);

route.post("/escalationWaiverApprove", [authMiddleware], userController.escalationWaiverApprove);

export default route;
