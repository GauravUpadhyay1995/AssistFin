import express from "express";
import * as Report1Controller from "../controllers/stateWiseController.js";

const route = express.Router();


route.post("/getStateData", Report1Controller.getStateData);
route.post("/getCityData", Report1Controller.getCityData);
route.post("/getPinData", Report1Controller.getPinData);
route.post("/getDurationData", Report1Controller.getDurationData);

route.post("/getAllBucket", Report1Controller.getAllBucket);
route.post("/getAllAgency", Report1Controller.getAllAgency);
route.post("/getAllProduct", Report1Controller.getAllProduct);

route.post("/getAllState", Report1Controller.getAllState);
route.post("/getCityByState", Report1Controller.getCityByState);
route.post("/getPinByCity", Report1Controller.getPinByCity);
route.post("/getAllCampaign", Report1Controller.getAllCampaign);
route.post("/getAllNbfc", Report1Controller.getAllNbfc);

route.post("/uploadMasterData", Report1Controller.uploadMasterData);
route.post("/getLoanAmount", Report1Controller.getLoanAmount);
route.post("/getAge", Report1Controller.getAge);





export default route;
