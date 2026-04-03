const express = require("express");
const router = express.Router();
const axios = require("axios");

const FAKECALL_URL = process.env.REACT_APP_ML_URL || "http://localhost:5001";

// GET /api/v1/fakecall/scripts
router.get("/scripts", async (req, res) => {
    try {
        const response = await axios.get(`${FAKECALL_URL}/call/scripts`);
        res.status(200).json(response.data);
    } catch (err) {
        res.status(500).json({ message: "Fake call service unavailable", error: err.message });
    }
});

// POST /api/v1/fakecall/generate
router.post("/generate", async (req, res) => {
    try {
        const { caller, tts } = req.body;
        const response = await axios.post(`${FAKECALL_URL}/call/generate`, { caller, tts: tts || false });
        res.status(200).json(response.data);
    } catch (err) {
        res.status(500).json({ message: "Fake call service unavailable", error: err.message });
    }
});

// GET /api/v1/fakecall/quick?caller=mom
router.get("/quick", async (req, res) => {
    try {
        const caller = req.query.caller || "mom";
        const response = await axios.get(`${FAKECALL_URL}/call/quick?caller=${caller}`);
        res.status(200).json(response.data);
    } catch (err) {
        res.status(500).json({ message: "Fake call service unavailable", error: err.message });
    }
});

module.exports = router;