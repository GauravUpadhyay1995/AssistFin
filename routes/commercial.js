import express from "express";
import * as commercialController from "../controllers/commercialController.js";
import authMiddleware from '../middlewares/tokenAuth.js';



const route = express.Router();
route.post("/addCommercialRule", [authMiddleware], commercialController.addCommercialRule);
route.post("/listCommercialRule", [authMiddleware], commercialController.listCommercialRule);



export default route;
