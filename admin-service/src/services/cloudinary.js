const cloudinary = require("cloudinary").v2;

let isConfigured = false;

exports.cloudinaryConnect = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET,
  });
  isConfigured = Boolean(
    process.env.CLOUD_NAME && process.env.API_KEY && process.env.API_SECRET
  );
  if (!isConfigured) {
    const error = new Error("CLOUD_NAME, API_KEY, and API_SECRET are required.");
    error.code = "CLOUDINARY_CONFIG_MISSING";
    throw error;
  }
};

exports.uploadImageToCloudinary = async (file, folder, height, quality) => {
  if (!isConfigured) exports.cloudinaryConnect();
  const options = {
    folder,
    resource_type: "auto",
  };
  if (height) options.height = height;
  if (quality) options.quality = quality;
  return cloudinary.uploader.upload(file.tempFilePath, options);
};
