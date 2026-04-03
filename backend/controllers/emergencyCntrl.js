const asyncHandler = require('express-async-handler');
const { User } = require('../models/userModel');
const { Emergency } = require('../models/emergencyModel');
const { sendHelpEmail, sendHelpEmailContacts } = require('../utils/email');
require('dotenv').config();

const sendemergencyCntrl = asyncHandler(async (req, res) => {
    const { userId, lat, long } = req.body;

    if (!lat || !long) {
        return res.status(403).json({ message: "latitude or longitude is missing" });
    }

    const resp = await fetch(`https://apis.mapmyindia.com/advanced/map/v1/rev_geocode?lat=${lat}&lng=${long}`, {
        headers: { Authorization: `Bearer ${process.env.MAPMYINDIA_TOKEN}` }
    });
    const data = await resp.json();

    if (!data || !data.results) {
        return res.status(500).json({ message: "Location service failed" });
    }

    const pincode = data.results[0].pincode;
    const formattedAddress = data.results[0].formatted_address;

    const user = await User.findById(userId);
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    const recipients = [user.emergencyMail];
    if (user.extraEmail1) recipients.push(user.extraEmail1);
    if (user.extraEmail2) recipients.push(user.extraEmail2);

    await sendHelpEmail(recipients, lat, long, user.uname, pincode, formattedAddress);

    const users = await User.find({ pinCode: pincode });
    const nearby = users.map(u => u.email);
    await sendHelpEmailContacts(nearby, lat, long, user.uname, pincode, formattedAddress);

    await Emergency.create({
        user: userId,
        emergencyLctOnMap: `https://maps.google.com/maps?q=${lat},${long}`,
        addressOfIncd: formattedAddress
    });

    res.status(200).json({ message: "Sent an SOS for help" });
});

const getAllEmergencies = asyncHandler(async (req, res) => {
    const emergencies = await Emergency.find().populate('user').sort({ createdAt: -1 });
    return res.status(200).json(emergencies);
});

const getSinglEmergency = asyncHandler(async (req, res) => {
    const emergency = await Emergency.findById(req.params.id).populate('user');
    if (!emergency) {
        return res.status(404).json({ message: "Emergency not found" });
    }
    return res.status(200).json(emergency);
});

const emergencyUpdate = asyncHandler(async (req, res) => {
    const emergency = await Emergency.findById(req.params.id);
    if (!emergency) {
        return res.status(404).json({ message: "Emergency not found" });
    }
    const updated = await Emergency.findByIdAndUpdate(req.params.id, req.body, { new: true });
    return res.status(200).json(updated);
});

const liveLocationCntrl = asyncHandler(async (req, res) => {
    const { userId, lat, long } = req.body;
    if (!userId || lat === undefined || long === undefined) {
        return res.status(400).json({ message: "Missing userId / lat / long" });
    }

    // store live location record for audit/real-time tracking if needed
    await Emergency.create({
        user: userId,
        emergencyLctOnMap: `https://maps.google.com/maps?q=${lat},${long}`,
        addressOfIncd: "Live location update"
    });

    return res.status(200).json({ message: "Live location received" });
});

module.exports = { sendemergencyCntrl, getAllEmergencies, getSinglEmergency, emergencyUpdate, liveLocationCntrl };