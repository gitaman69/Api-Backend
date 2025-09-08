// utils/uploadToCloudinary.js
const streamifier = require("streamifier");
const cloudinary = require("../config/cloudinary");

/**
 * Upload a Buffer to Cloudinary as a stream.
 * Returns the full result object from Cloudinary (including secure_url).
 */
function uploadBufferToCloudinary(buffer, folder = "kyc_docs", resource_type = "auto", public_id = undefined) {
  return new Promise((resolve, reject) => {
    const options = { folder };
    if (public_id) options.public_id = public_id;

    const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

module.exports = uploadBufferToCloudinary;
