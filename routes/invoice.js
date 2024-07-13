import express from "express";
import * as invoiceController from "../controllers/invoiceController.js";
import authMiddleware from '../middlewares/tokenAuth.js';
import upload from "../config/multer.js";
const cpUpload = upload.fields([
    { name: 'file', maxCount: 1 },
])
const route = express.Router();
route.post("/getInvoice",[authMiddleware], invoiceController.getInvoice);
route.post("/confirmInvoice",[cpUpload, authMiddleware], invoiceController.confirmInvoice);
route.post("/getPayment",[authMiddleware], invoiceController.getPayment);
route.post("/deleteInvoice",[authMiddleware], invoiceController.deleteInvoice);
route.post("/changeInvoiceStatus",[authMiddleware], invoiceController.changeInvoiceStatus);


export default route;
