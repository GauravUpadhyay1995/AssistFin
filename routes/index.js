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
    { name: 'COI', maxCount: 1 },
    { name: 'GSTCertificate', maxCount: 1 },
    { name: 'Empannelment', maxCount: 1 },
    { name: 'SignedAgreement', maxCount: 1 },
])
const cpUpload2 = upload.fields([
    { name: 'Profile', maxCount: 1 },
    { name: 'Pan', maxCount: 1 },
    { name: 'Adhaar', maxCount: 1 },
    { name: 'PoliceVerification', maxCount: 1 },
    { name: 'DRA', maxCount: 1 },

])

const route = express.Router();

route.post("/addSuperAdminEmployee", [authMiddleware], userController.addSuperAdminEmployee);

route.post("/addAgencyEmployee", [cpUpload2, authMiddleware], userController.addAgencyEmployee);

route.post("/addNbfcEmployee", [authMiddleware], userController.addNbfcEmployee);
route.post("/addAgency", [cpUpload1, authMiddleware], userController.addAgency);
route.post("/addNbfc", [cpUpload1, authMiddleware], userController.addNbfc);
route.post("/userLogin", userController.userLogin);
route.post("/UpdateUserProfile", [cpUpload, authMiddleware], userController.UpdateUserProfile);
route.post("/deleteUser", [authMiddleware], userController.deleteUser);
route.post("/getAgency", [authMiddleware], userController.getAgency);
route.post("/getAgencyEmployees", [authMiddleware], userController.getAgencyEmployees);
route.post("/getSuperAdminEmployees", [authMiddleware], userController.getSuperAdminEmployees);

route.post("/getNbfcEmployees", [authMiddleware], userController.getNbfcEmployees);
route.post("/getNBFC", [authMiddleware], userController.getNBFC);
route.post("/getUserProfile", [authMiddleware], userController.getUserProfile);
route.post("/AddProducts", [authMiddleware], userController.AddProducts);
route.post("/getProducts", [authMiddleware], userController.getProducts);
route.post("/deleteProduct", [authMiddleware], userController.deleteProduct);
route.post("/updateProduct", [authMiddleware], userController.updateProduct);
route.post("/approveUser", [authMiddleware], userController.approveUser);
route.post("/getCustomerDetails", [authMiddleware], userController.getCustomerDetails);
route.post("/addWaiverRequest", [authMiddleware], userController.addWaiverRequest);
route.post("/waiverList", [authMiddleware], userController.waiverList);
route.post("/deleteWaiverRequest", [authMiddleware], userController.deleteWaiverRequest);
route.post("/nbfcWaiverList", [authMiddleware], userController.nbfcWaiverList);
route.post("/waiverDetails", [authMiddleware], userController.waiverDetails);

route.post("/approvedWaivers", [authMiddleware], userController.approvedWaivers);
route.post("/approveWaiver", [authMiddleware], userController.approveWaiver);
route.post("/addWaiverRule", [authMiddleware], userController.addWaiverRule);

route.post("/getAgencyList", [authMiddleware], userController.getAgencyList);

route.post("/waiverRuleLists", [authMiddleware], userController.waiverRuleLists);
route.post("/getRoles", [authMiddleware], userController.getRoles);
route.post("/getRoleWiseEmployee", [authMiddleware], userController.getRoleWiseEmployee);

route.post("/getAllRole", [authMiddleware], userController.getAllRole);

route.post("/getAgencyDetials", [authMiddleware], userController.getAgencyDetials);

export default route;
