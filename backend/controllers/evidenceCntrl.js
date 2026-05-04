const asyncHandler = require("express-async-handler");
const Evidence = require("../models/evidenceModel");
const fs = require("fs");
const path = require("path");

// @desc    Upload new evidence
// @route   POST /api/v1/evidence
// @access  Public (for MVP, ideally protected with token later)
const uploadEvidence = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error("No file uploaded");
  }

  // Determine file type from mimetype
  const fileType = req.file.mimetype.startsWith("video") ? "video" : 
                   req.file.mimetype.startsWith("audio") ? "audio" : "other";

  // Create evidence record
  // Assuming a generic user ID for now if user isn't authenticated
  const evidence = await Evidence.create({
    filePath: `/uploads/${req.file.filename}`,
    fileType: fileType,
    triggerType: req.body.triggerType || "StealthMode",
    // user: req.user.id // uncomment if authentication is added
  });

  res.status(201).json(evidence);
});

// @desc    Get all evidence
// @route   GET /api/v1/evidence
// @access  Public (for MVP, ideally protected with token later)
const getEvidence = asyncHandler(async (req, res) => {
  // Normally filter by req.user.id
  const evidenceList = await Evidence.find({}).sort({ createdAt: -1 });
  res.status(200).json(evidenceList);
});

// @desc    Delete evidence
// @route   DELETE /api/v1/evidence/:id
// @access  Public (for MVP)
const deleteEvidence = asyncHandler(async (req, res) => {
  const evidence = await Evidence.findById(req.params.id);

  if (!evidence) {
    res.status(404);
    throw new Error("Evidence not found");
  }

  // Delete the actual file
  const filePath = path.join(__dirname, "..", evidence.filePath);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  // Delete from database
  await Evidence.findByIdAndDelete(req.params.id);

  res.status(200).json({ id: req.params.id, message: "Evidence deleted" });
});

module.exports = {
  uploadEvidence,
  getEvidence,
  deleteEvidence,
};
