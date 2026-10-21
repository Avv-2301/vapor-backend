const Response = require("@avv-2301/gamers-vault-common");
const Constant = require("@avv-2301/gamers-vault-common");
const { uploadImageToCloudinary } = require("../../services/cloudinary");

const uploadFolders = new Set([
  "games/thumbnails",
  "games/media",
  "banners",
  "gift-cards",
]);
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

exports.uploadImage = async (req, res) => {
  try {
    const image = req.files?.image;
    const folder = req.body?.folder;
    if (!image || Array.isArray(image)) {
      return Response.errorResponseWithoutData(
        res,
        "Choose one image to upload",
        Constant.STATUS_CODES.BAD_REQUEST
      );
    }
    if (!allowedImageTypes.has(image.mimetype)) {
      return Response.errorResponseWithoutData(
        res,
        "Upload a JPEG, PNG, or WebP image",
        Constant.STATUS_CODES.BAD_REQUEST
      );
    }
    if (!uploadFolders.has(folder)) {
      return Response.errorResponseWithoutData(
        res,
        "Invalid image folder",
        Constant.STATUS_CODES.BAD_REQUEST
      );
    }

    const uploadedImage = await uploadImageToCloudinary(image, folder);
    return Response.successResponseData(
      res,
      { url: uploadedImage.secure_url, publicId: uploadedImage.public_id },
      Constant.STATUS_CODES.SUCCESS,
      "Image uploaded successfully"
    );
  } catch (error) {
    console.error("Image upload failed:", error.code || error.message);
    const message = error.code === "CLOUDINARY_CONFIG_MISSING"
      ? "Cloudinary is not configured. Set CLOUD_NAME, API_KEY, and API_SECRET in the admin service environment, then restart it."
      : "Image upload failed. Check the admin service logs and Cloudinary configuration.";
    return Response.errorResponseWithoutData(
      res,
      message,
      Constant.STATUS_CODES.INTERNAL_SERVER
    );
  }
};
