const express = require("express");
const router = express.Router();
const asyncHandler = require("express-async-handler");
const { User } = require("../models/userModel");

// POST /api/v1/sos/trigger
router.post("/trigger", asyncHandler(async (req, res) => {
    const { userId, lat, lng, address, message } = req.body;

    if (!userId) {
        res.status(400);
        throw new Error("userId is required");
    }

    const user = await User.findById(userId);
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    const contacts = [];
    if (user.emergencyMail)  contacts.push({ type: "email", value: user.emergencyMail, label: "Emergency Email" });
    if (user.emergencyNo)    contacts.push({ type: "phone", value: user.emergencyNo,   label: "Emergency Phone" });
    if (user.extraEmail1)    contacts.push({ type: "email", value: user.extraEmail1,   label: "Extra Email 1" });
    if (user.extraEmail2)    contacts.push({ type: "email", value: user.extraEmail2,   label: "Extra Email 2" });
    if (user.extraPhone1)    contacts.push({ type: "phone", value: user.extraPhone1,   label: "Extra Phone 1" });
    if (user.extraPhone2)    contacts.push({ type: "phone", value: user.extraPhone2,   label: "Extra Phone 2" });

    const locationUrl = (lat && lng) ? `https://maps.google.com/?q=${lat},${lng}` : null;
    const locationStr = locationUrl || address || "Location unavailable";

    const sosMessage = message ||
        `SOS ALERT from ${user.uname}! They may need immediate help.\nLocation: ${locationStr}\nTime: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`;

    res.status(200).json({
        success: true,
        userName: user.uname,
        contacts,
        sosMessage,
        locationUrl,
        timestamp: new Date().toISOString(),
    });
}));

// POST /api/v1/sos/checkin
router.post("/checkin", asyncHandler(async (req, res) => {
    const { userId } = req.body;
    if (!userId) { res.status(400); throw new Error("userId is required"); }
    const user = await User.findById(userId);
    if (!user)   { res.status(404); throw new Error("User not found"); }
    res.status(200).json({
        success: true,
        message: `Check-in confirmed for ${user.uname}`,
        checkedInAt: new Date().toISOString(),
    });
}));

// GET /api/v1/sos/contacts/:userId
router.get("/contacts/:userId", asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.userId);
    if (!user) { res.status(404); throw new Error("User not found"); }
    const contacts = [];
    if (user.emergencyMail)  contacts.push({ type: "email", value: user.emergencyMail, label: "Emergency Email" });
    if (user.emergencyNo)    contacts.push({ type: "phone", value: user.emergencyNo,   label: "Emergency Phone" });
    if (user.extraEmail1)    contacts.push({ type: "email", value: user.extraEmail1,   label: "Extra Email 1" });
    if (user.extraEmail2)    contacts.push({ type: "email", value: user.extraEmail2,   label: "Extra Email 2" });
    if (user.extraPhone1)    contacts.push({ type: "phone", value: user.extraPhone1,   label: "Extra Phone 1" });
    if (user.extraPhone2)    contacts.push({ type: "phone", value: user.extraPhone2,   label: "Extra Phone 2" });
    res.status(200).json({ success: true, contacts, userName: user.uname });
}));

module.exports = router;