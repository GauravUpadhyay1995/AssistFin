import express from "express";
import * as clientFinderController from "../controllers/clientFinderController.js";
import authMiddleware from '../middlewares/tokenAuth.js';



const route = express.Router();
route.post("/fetchClients", clientFinderController.fetchClients);
route.post("/generateFakeData", clientFinderController.generateFakeData);

route.post("/uploadClientFinder", clientFinderController.uploadClientFinder);


export default route;
