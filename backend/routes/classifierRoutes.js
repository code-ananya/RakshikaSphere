const express = require("express");
const router = express.Router();
const axios = require("axios");
const { Incident } = require("../models/incidentRptModel");

const CLASSIFIER_URL = process.env.CLASSIFIER_URL || "http://localhost:5002";

// Classify a single report text
router.post("/classify", async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ message: "No text provided" });

        const response = await axios.post(`${CLASSIFIER_URL}/classify`, { text });
        return res.status(200).json({ success: true, ...response.data });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Classifier service unavailable", error: error.message });
    }
});

// Classify all incidents in DB and return with severity
router.get("/all", async (req, res) => {
    try {
        const incidents = await Incident.find({}).sort({ createdAt: -1 });

        if (!incidents.length) {
            return res.status(200).json({ success: true, incidents: [] });
        }

        const payload = incidents.map(inc => ({
            id: inc._id.toString(),
            report: inc.report || ""
        }));

        const mlResponse = await axios.post(`${CLASSIFIER_URL}/classify-batch`, { incidents: payload });
        const severityMap = {};
        mlResponse.data.results.forEach(r => { severityMap[r.id] = r; });

        const enriched = incidents.map(inc => ({
            _id: inc._id,
            report: inc.report,
            address: inc.address,
            pincodeOfIncident: inc.pincodeOfIncident,
            isSeen: inc.isSeen,
            meidaSt: inc.meidaSt,
            createdAt: inc.createdAt,
            severity: severityMap[inc._id.toString()]?.severity || "Low",
            confidence: severityMap[inc._id.toString()]?.confidence || 0.4,
            suggested_action: severityMap[inc._id.toString()]?.suggested_action || "Review as needed."
        }));

        // Sort by severity: Critical > High > Medium > Low
        const order = { Critical: 0, High: 1, Medium: 2, Low: 3 };
        enriched.sort((a, b) => (order[a.severity] ?? 3) - (order[b.severity] ?? 3));

        return res.status(200).json({ success: true, incidents: enriched, total: enriched.length });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to classify incidents", error: error.message });
    }
});

module.exports = router;