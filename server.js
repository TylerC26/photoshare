const express = require("express");
const multer = require("multer");
const path = require("path");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const fs = require("fs");
const app = express();

// Environment variables for AWS credentials
const BUCKET_NAME = "photosharecloud";

// AWS S3 Client (AWS SDK v3)
const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  region: process.env.AWS_REGION,
});

// Multer storage configuration (local storage as fallback)
const storage = multer.memoryStorage(); // Use memory storage to process files in memory

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB file size limit
  },
});

// Serve the HTML file
app.use(express.static("public"));

// Create the "uploads" folder if it doesn't exist (for local testing)
// add changesssss
if (!fs.existsSync("./uploads")) {
  fs.mkdirSync("./uploads");
}

// POST endpoint to upload files to S3
app.post("/upload", upload.single("photo"), async (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }

  try {
    const fileName = Date.now() + path.extname(req.file.originalname);

    // Upload file to S3
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      ACL: "public-read", // Make the file publicly readable
    };

    const command = new PutObjectCommand(uploadParams);
    await s3.send(command);

    const fileUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
    res.send(`Photo uploaded successfully: ${fileUrl}`);
  } catch (error) {
    console.error("Error uploading file to S3:", error);
    res.status(500).send("Error uploading file to S3");
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});