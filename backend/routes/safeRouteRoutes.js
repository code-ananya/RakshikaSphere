const express = require("express");
const router = express.Router();
const axios = require("axios");
const { Incident } = require("../models/incidentRptModel");

const ML_SERVICE_URL = process.env.REACT_APP_ML_URL || "http://localhost:5001";

router.post("/", async (req, res) => {
    try {
        const { start, end } = req.body;

        if (!start || !end) {
            return res.status(400).json({ message: "Start and end coordinates required" });
        }

        // Fetch danger zones from ML service
        let danger_zones = [];
        try {
            const incidents = await Incident.find({
                lat: { $exists: true, $ne: null },
                lng: { $exists: true, $ne: null }
            });

            if (incidents.length > 0) {
                const mlResponse = await axios.post(`${ML_SERVICE_URL}/predict`, {
                    incidents: incidents.map(i => ({ lat: i.lat, lng: i.lng, id: i._id }))
                });
                danger_zones = mlResponse.data.danger_zones || [];
            }
        } catch (e) {
            console.log("Could not fetch danger zones:", e.message);
        }

        // Call safe route ML service
        const routeResponse = await axios.post(`${ML_SERVICE_URL}/safe-route`, {
            start,
            end,
            danger_zones
        });

        return res.status(200).json(routeResponse.data);

    } catch (error) {
        console.error("Safe route error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to calculate safe route",
            error: error.message
        });
    }
});

module.exports = router;