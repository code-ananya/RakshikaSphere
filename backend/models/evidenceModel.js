const mongoose = require("mongoose");

const evidenceSchema = mongoose.Schema(
  {
    filePath: {
      type: String,
      required: [true, "File path is required"],
    },
    fileType: {
      type: String,
      required: [true, "File type is required"],
    },
    triggerType: {
      type: String,
      default: "StealthMode",
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Evidence", evidenceSchema);
