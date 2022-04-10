const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const path = require('path');

module.exports = {
    capitalize: (string) => {
        const components = string.split(' ');
        let array = [];
        components.map(comp => {
            return array.push(`${comp.substring(0, 1).toUpperCase()}${comp.substring(1, comp.length).toLowerCase()}`);
        });
        return array.join(' ');
    },
    capitalizeArray: (array) => {
        return array.map( arr => {
            return module.exports.capitalize(arr);
        });
    },
    currentTime: () => {
        const today = new Date();
        const date = `${today.getFullYear()}-${(Number(today.getMonth())+1)}-${today.getDate()}`;
        const time = `${today.getHours()}:${today.getMinutes()}:${today.getSeconds()}`;
        return `${date} ${time}`;
    },
    cloudinaryConfig: () => {
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });

        return cloudinary;
    },
    multerConfig: () => {
        const storage = multer.diskStorage({});
        const fileFilter = (req, file, cb) => {
            const extension = path.extname(file.originalname);
            const allowedTypes = ['.jpg', '.jpeg', '.png'];
            if (!allowedTypes.includes(extension.toLowerCase())) {
                return req.res.status(412).json({message: 'Incorrect file type selected. Only jpg, jpeg and png are allowed'});
            }
            return cb(null, true);
        }

        return multer({ 
            storage, fileFilter
        });

    },
    slugger: (string) => {
        const cleanString = string.replace(',','').replace('?','').replace('!', '').replace('-', ' ').toLowerCase();
        const splittedStr = cleanString.split(' ');
        return splittedStr.join('-');
    }
}