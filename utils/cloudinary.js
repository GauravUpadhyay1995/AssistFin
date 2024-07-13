import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();
cloudinary.config({
    cloud_name: process.env.CL_CLOUD_NAME,
    api_key: process.env.CL_API_KEY,
    api_secret: process.env.CL_API_SECRET,// Click 'View Credentials' below to copy your API secret
});

const UploadOnCLoudinary = async (localfilepath) => {


    try {
        if (!localfilepath) { return null }
        const response = await cloudinary.uploader.upload(localfilepath, {
            resource_type: "raw"
        })
        fs.unlinkSync(localfilepath)
        return response.url;

    } catch (error) {
        fs.unlinkSync(localfilepath)
        return null
    }

}

export { UploadOnCLoudinary }