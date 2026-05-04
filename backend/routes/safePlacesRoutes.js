const express = require("express");
const router = express.Router();
const asyncHandler = require("express-async-handler");
const axios = require("axios");

const PLACE_TYPES = {
    police:   { label: "Police Station", emoji: "👮", search: "police station" },
    hospital: { label: "Hospital",       emoji: "🏥", search: "hospital" },
    clinic:   { label: "Clinic",         emoji: "🩺", search: "clinic" },
    pharmacy: { label: "Pharmacy",       emoji: "💊", search: "pharmacy" },
    fire:     { label: "Fire Station",   emoji: "🚒", search: "fire station" },
    shelter:  { label: "Shelter",        emoji: "🏠", search: "shelter" },
};

const haversineM = (lat1, lng1, lat2, lng2) => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLng = (lng2 - lng1) * (Math.PI / 180);
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

router.get("/", asyncHandler(async (req, res) => {
    const { lat, lng, radius = 3000, types = "police,hospital,clinic,pharmacy" } = req.query;

    if (!lat || !lng) return res.status(400).json({ message: "lat and lng required" });

    const requestedTypes = types.split(",").filter(t => PLACE_TYPES[t]);
    const allPlaces = [];

    for (const type of requestedTypes) {
        const info = PLACE_TYPES[type];
        try {
            // Use Nominatim search API
            const response = await axios.get("https://nominatim.openstreetmap.org/search", {
                params: {
                    q: info.search,
                    format: "json",
                    limit: 10,
                    addressdetails: 1,
                    viewbox: `${parseFloat(lng)-0.05},${parseFloat(lat)+0.05},${parseFloat(lng)+0.05},${parseFloat(lat)-0.05}`,
                    bounded: 1,
                },
                headers: { "User-Agent": "RakshikaSphere/1.0" },
                timeout: 10000,
            });

            const results = response.data || [];
            results.forEach((place, i) => {
                const placeLat = parseFloat(place.lat);
                const placeLng = parseFloat(place.lon);
                const distanceM = haversineM(parseFloat(lat), parseFloat(lng), placeLat, placeLng);
                if (distanceM <= parseFloat(radius)) {
                    allPlaces.push({
                        id: place.place_id || i,
                        name: place.display_name?.split(",")[0] || info.label,
                        type, label: info.label, emoji: info.emoji,
                        lat: placeLat, lng: placeLng,
                        distance: Math.round(distanceM),
                        distanceText: distanceM < 1000
                            ? `${Math.round(distanceM)} m`
                            : `${(distanceM/1000).toFixed(1)} km`,
                        address: place.display_name || null,
                        phone: null,
                        mapsUrl: `https://maps.google.com/?q=${placeLat},${placeLng}`,
                    });
                }
            });
        } catch (e) {
            console.log(`Nominatim failed for ${type}:`, e.message);
        }
    }

    // Sort by distance
    allPlaces.sort((a, b) => a.distance - b.distance);

    return res.status(200).json({
        success: true,
        total: allPlaces.length,
        userLocation: { lat: parseFloat(lat), lng: parseFloat(lng) },
        radiusM: parseInt(radius),
        places: allPlaces,
    });
}));

module.exports = router;