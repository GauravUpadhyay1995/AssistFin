import db from './config/db.js';
import express from "express";
import cors from "cors";
import landingRoute from "./routes/index.js";
import Report1Route from "./routes/report1.js";
import uploadData from "./routes/uploadData.js";
import commercialRoute from "./routes/commercial.js";
import invoiceRoute from "./routes/invoice.js";
import authMiddleware from './middlewares/tokenAuth.js';
import escalationRoute from "./routes/escalation.js";
import clientFinderRoute from "./routes/clientFinder.js";
import allocation from "./routes/allocation.js";

import { WaiverPolicyExpiry, WaiverRequestSchemeExpiry } from './cronJobs.js';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use("/api/users", landingRoute);
app.use("/api/report1", authMiddleware, Report1Route);
app.use("/api/commercial", authMiddleware, commercialRoute);
app.use("/api/invoice", authMiddleware, invoiceRoute);
app.use("/api/escalation", authMiddleware, escalationRoute);
app.use("/api/clientFinder", clientFinderRoute);
app.use("/api/upload", authMiddleware, uploadData);
app.use("/api/allocation", allocation);





// WaiverPolicyExpiry();
// WaiverRequestSchemeExpiry();
app.listen(process.env.APP_PORT, () =>
    console.log('Server is running on http://localhost:' + process.env.APP_PORT)
);