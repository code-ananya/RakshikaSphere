const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { uploadEvidence, getEvidence, deleteEvidence } = require("../controllers/evidenceCntrl");

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, `evidence-${Date.now()}${path.extname(file.originalname) || '.webm'}`);
  },
});

const upload = multer({ storage: storage });

router.route("/")
  .get(getEvidence)
  .post(upload.single("evidenceFile"), uploadEvidence);

router.route("/:id")
  .delete(deleteEvidence);

module.exports = router;
