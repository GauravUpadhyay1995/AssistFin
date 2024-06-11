import db from './config/db.js';
import express from "express";
import cors from "cors";
import landingRoute from "./routes/index.js";
import Report1Route from "./routes/report1.js";
import uploadData from "./routes/uploadData.js";
import authMiddleware from './middlewares/tokenAuth.js'; 

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use("/api/users", landingRoute);
app.use("/api/report1",authMiddleware, Report1Route);
app.use("/api/upload",authMiddleware, uploadData);

app.listen(process.env.APP_PORT, () =>
    console.log('Server is running on http://localhost:'+process.env.APP_PORT)
);