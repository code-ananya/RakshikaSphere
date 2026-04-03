const express = require("express");
const router = express.Router();
const axios = require("axios");

const DETECTOR_URL = process.env.REACT_APP_ML_URL || "http://localhost:5001";

// POST /api/v1/violence/analyze/text
router.post("/analyze/text", async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ message: "text is required" });
        const response = await axios.post(`${DETECTOR_URL}/analyze/text`, { text });
        res.status(200).json(response.data);
    } catch (err) {
        res.status(500).json({ message: "Violence detector service unavailable", error: err.message });
    }
});

// POST /api/v1/violence/analyze/image
router.post("/analyze/image", async (req, res) => {
    try {
        const { image, context } = req.body;
        if (!image) return res.status(400).json({ message: "image is required" });
        const response = await axios.post(`${DETECTOR_URL}/analyze/image`, { image, context });
        res.status(200).json(response.data);
    } catch (err) {
        res.status(500).json({ message: "Violence detector service unavailable", error: err.message });
    }
});

// POST /api/v1/violence/analyze/report
router.post("/analyze/report", async (req, res) => {
    try {
        const { report, image, address } = req.body;
        const response = await axios.post(`${DETECTOR_URL}/analyze/report`, { report, image, address });
        res.status(200).json(response.data);
    } catch (err) {
        res.status(500).json({ message: "Violence detector service unavailable", error: err.message });
    }
});

module.exports = router;