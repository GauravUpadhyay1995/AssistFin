import express from "express";
import * as callLogController from "../controllers/callLogController.js";


const route = express.Router();

route.get("/", callLogController.home);
route.post("/callLog", callLogController.callLog);
route.post("/getAllUsers", callLogController.getAllUsers);
route.post("/getAllCampaign", callLogController.getAllCampaign);
route.post("/getAllLender", callLogController.getAllLender);



export default route;
