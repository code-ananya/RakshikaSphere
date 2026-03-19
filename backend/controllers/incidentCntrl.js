const asyncHandler = require('express-async-handler');
const { Incident } = require('../models/incidentRptModel');
const { User } = require('../models/userModel');
const fs = require('fs');
require('dotenv').config();

const addIncident = asyncHandler(async (req, res) => {
    const { user, report, pincodeOfIncident, mimeType, address, lat, lng } = req.body;
    const note = req.file ? req.file.path : null;  // ← fixed: file is optional

    if (note) {
        // File was uploaded — try S3
        try {
            const AWS = require('aws-sdk');
            AWS.config.update({
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                region: process.env.AWS_REGION || 'us-east-2'
            });
            const s3 = new AWS.S3();
            const params = {
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: note,
                Body: fs.createReadStream(req.file.path),
                ContentType: mimeType
            };
            const s3Response = await s3.upload(params).promise();
            const incFile = s3Response.Location;

            const incident = await Incident.create({
                user,
                report,
                pincodeOfIncident,
                address,
                meidaSt: incFile,
                lat: lat ? parseFloat(lat) : null,
                lng: lng ? parseFloat(lng) : null
            });

            if (incident) {
                res.status(201).json({ message: "Incident reported successfully" });
            } else {
                res.status(500).json({ message: "Something went wrong" });
            }
        } catch (err) {
            // S3 failed — save without media
            const incident = await Incident.create({
                user,
                report,
                pincodeOfIncident,
                address,
                lat: lat ? parseFloat(lat) : null,
                lng: lng ? parseFloat(lng) : null
            });
            if (incident) {
                res.status(201).json({ message: "Incident reported successfully (without media)" });
            } else {
                res.status(500).json({ message: "Something went wrong" });
            }
        }
    } else {
        // No file — save without media
        const incident = await Incident.create({
            user,
            report,
            address,
            pincodeOfIncident,
            lat: lat ? parseFloat(lat) : null,
            lng: lng ? parseFloat(lng) : null
        });

        if (incident) {
            res.status(201).json({ message: "Incident reported successfully" });
        } else {
            res.status(500).json({ message: "Something went wrong" });
        }
    }
});

const getAllIncidents = asyncHandler(async (req, res) => {
    const incidents = await Incident.find({});
    const data = [];
    for (const x of incidents) {
        const user = await User.findById(x.user);
        if (user) {
            data.push({
                uname: user.uname,
                address: x.address,
                pincode: x.pincodeOfIncident,
                report: x.report,
                isSeen: x.isSeen,
                image: x.meidaSt || "empty",
                createdAt: x.createdAt,
                updatedAt: x.updatedAt
            });
        }
    }
    res.status(200).json(data);
});

const acknowledgeInc = asyncHandler(async (req, res) => {
    const inc = req.params.id;
    const incident = await Incident.findById(inc);
    if (incident) {
        incident.isSeen = true;
        await incident.save();
        res.status(200).json({ message: "Acknowledged" });
    } else {
        res.status(404).json({ message: "Incident not found" });
    }
});

module.exports = { addIncident, getAllIncidents, acknowledgeInc };
