const asyncHandler = require('express-async-handler');
const { Incident } = require('../models/incidentRptModel');
const { User } = require('../models/userModel');
const fs = require('fs');
require('dotenv').config();

const addIncident = asyncHandler(async (req, res) => {
    const { user, report, pincodeOfIncident, mimeType, address, lat, lng } = req.body;

    if (!user || !report) {
        return res.status(400).json({ message: "User and report are required" });
    }

    const note = req.file ? req.file.path : null;
    let mediaUrl = null;

    if (note) {
        try {
            const AWS = require("aws-sdk");
            if (
                process.env.AWS_ACCESS_KEY_ID &&
                process.env.AWS_SECRET_ACCESS_KEY &&
                process.env.AWS_BUCKET_NAME
            ) {
                AWS.config.update({
                    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                    region: process.env.AWS_REGION || "us-east-2"
                });

                if (fs.existsSync(req.file.path)) {
                    const s3 = new AWS.S3();
                    const params = {
                        Bucket: process.env.AWS_BUCKET_NAME,
                        Key: note,
                        Body: fs.createReadStream(req.file.path),
                        ContentType: mimeType
                    };
                    const s3Response = await s3.upload(params).promise();
                    mediaUrl = s3Response.Location;
                }
            }
        } catch (err) {
            console.log("S3 upload failed:", err.message);
        }
    }

    const incident = await Incident.create({
        user,
        report,
        pincodeOfIncident,
        address,
        meidaSt: mediaUrl,
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null
    });

    return res.status(201).json({ message: "Incident reported successfully" });
});

const getAllIncidents = asyncHandler(async (req, res) => {
    const incidents = await Incident.find().populate('user').sort({ createdAt: -1 });
    return res.status(200).json(incidents);
});

const acknowledgeInc = asyncHandler(async (req, res) => {
    const incident = await Incident.findById(req.params.id);

    if (!incident) {
        return res.status(404).json({ message: "Incident not found" });
    }

    incident.acknowledged = true;
    await incident.save();

    return res.status(200).json({ message: "Incident acknowledged" });
});

module.exports = { addIncident, getAllIncidents, acknowledgeInc };