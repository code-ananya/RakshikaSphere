const asyncHandler = require('express-async-handler');
const { User } = require('../models/userModel');
const { Emergency } = require('../models/emergencyModel');
require('dotenv').config();

// Add whatever these are imported from in your project
const { getData } = require('../utils/getData');           // adjust path
const { sendHelpEmail } = require('../utils/sendHelpEmail');         // adjust path
const { sendHelpEmailContacts } = require('../utils/sendHelpEmailContacts'); // adjust path

const sendemergencyCntrl = asyncHandler(async (req, res) => {
    const { userId, lat, long } = req.body;

    if (!lat || !long) {
        return res.status(403).json({ message: "latitude or longitude is missing" });
    }

    const resp = await getData(`https://apis.mapmyindia.com/...`);

    if (!resp || !resp.results) {
        return res.status(500).json({ message: "Location service failed" });
    }

    const pincode = resp.results[0].pincode;
    const formattedAddress = resp.results[0].formatted_address;

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

module.exports = { sendemergencyCntrl };