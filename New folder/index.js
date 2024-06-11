import db from './config/db.js';
import express from "express";
import cors from "cors";
import landingRoute from "./routes/index.js";
import Report1Route from "./routes/report1.js";
import UploadRoute from "./routes/upload.js";
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors())

app.use("/api/callLog", landingRoute);
app.use("/api/report1", Report1Route);
app.use("/api/upload", UploadRoute);

app.listen(process.env.APP_PORT, () =>
    console.log('Server is running on http://localhost:'+process.env.APP_PORT)
);








