import express from "express";
import * as invoiceController from "../controllers/invoiceController.js";
const route = express.Router();
route.post("/getInvoice", invoiceController.getInvoice);
export default route;
