const express = require("express");
const router = express.Router();
const axios = require("axios");
const { Incident } = require("../models/incidentRptModel");

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:5001";

router.get("/", async (req, res) => {
    try {
        // Fetch all incidents that have lat/lng
        const incidents = await Incident.find(
            { lat: { $exists: true }, lng: { $exists: true } }
        );

        if (!incidents || incidents.length === 0) {
            return res.status(200).json({
                success: true,
                danger_zones: [],
                total_incidents: 0,
                total_clusters: 0,
                message: "No incidents with location data found"
            });
        }

        // Format for ML service
        const formattedIncidents = incidents
            .filter(inc => inc.lat && inc.lng)
            .map(inc => ({
                lat: inc.lat,
                lng: inc.lng,
                id: inc._id
            }));

        if (formattedIncidents.length === 0) {
            return res.status(200).json({
                success: true,
                danger_zones: [],
                total_incidents: 0,
                total_clusters: 0,
                message: "No incidents with valid coordinates"
            });
        }

        // Call ML service
        const mlResponse = await axios.post(`${ML_SERVICE_URL}/predict`, {
            incidents: formattedIncidents
        });

        return res.status(200).json({
            success: true,
            danger_zones: mlResponse.data.danger_zones,
            total_incidents: mlResponse.data.total_incidents,
            total_clusters: mlResponse.data.total_clusters
        });

    } catch (error) {
        console.error("Danger zone error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to predict danger zones",
            error: error.message
        });
    }
});

module.exports = router;