const mongoose = require("mongoose");
const IncidentSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Types.ObjectId,
      ref: "User",
    },
    meidaSt: {
      type: String,
    },
    pincodeOfIncident: {
      type: String,
    },
    report: {
      type: String,
    },
    isSeen: {
      type: Boolean,
      default: false
    },
    address: {
      type: String
    },
    lat: {
      type: Number,    // ← ADDED
    },
    lng: {
      type: Number,    // ← ADDED
    },
    acknowledged: {
    type: Boolean,
    default: false
}
  },
  { timestamps: true }
);

const Incident = mongoose.model("Incident", IncidentSchema);
module.exports = { Incident }