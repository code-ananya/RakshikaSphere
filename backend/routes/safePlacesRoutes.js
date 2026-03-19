const express = require("express");
const router = express.Router();
const asyncHandler = require("express-async-handler");
const axios = require("axios");

// Place type → Overpass amenity tags
const PLACE_TYPES = {
    police:   { tag: 'amenity="police"',        label: "Police Station",  emoji: "👮" },
    hospital: { tag: 'amenity="hospital"',       label: "Hospital",        emoji: "🏥" },
    clinic:   { tag: 'amenity="clinic"',         label: "Clinic",          emoji: "🩺" },
    pharmacy: { tag: 'amenity="pharmacy"',       label: "Pharmacy",        emoji: "💊" },
    fire:     { tag: 'amenity="fire_station"',   label: "Fire Station",    emoji: "🚒" },
    shelter:  { tag: 'amenity="shelter"',        label: "Shelter",         emoji: "🏠" },
};

// GET /api/v1/safeplaces?lat=28.6&lng=77.2&radius=3000&types=police,hospital
router.get("/", asyncHandler(async (req, res) => {
    const { lat, lng, radius = 3000, types = "police,hospital,clinic,pharmacy" } = req.query;

    if (!lat || !lng) {
        return res.status(400).json({ message: "lat and lng are required" });
    }

    const requestedTypes = types.split(",").filter(t => PLACE_TYPES[t]);
    if (requestedTypes.length === 0) {
        return res.status(400).json({ message: "No valid place types specified" });
    }

    // Build Overpass QL query
    const tagUnion = requestedTypes
        .map(t => `node[${PLACE_TYPES[t].tag}](around:${radius},${lat},${lng});
  way[${PLACE_TYPES[t].tag}](around:${radius},${lat},${lng});`)
        .join("\n  ");

    const query = `[out:json][timeout:10];
(
  ${tagUnion}
);
out center 40;`;

    try {
        const overpassRes = await axios.post(
            "https://overpass-api.de/api/interpreter",
            query,
            { headers: { "Content-Type": "text/plain" }, timeout: 12000 }
        );

        const elements = overpassRes.data?.elements || [];

        const places = elements.map(el => {
            // Determine place type from tags
            const tags = el.tags || {};
            let type = "unknown";
            let info = { label: "Place", emoji: "📍" };

            for (const [key, val] of Object.entries(PLACE_TYPES)) {
                // extract the amenity value from the tag string e.g. 'amenity="police"' → police
                const match = val.tag.match(/"([^"]+)"/);
                if (match && tags.amenity === match[1]) {
                    type = key;
                    info = val;
                    break;
                }
            }

            // coordinates: node has lat/lng directly; way has center
            const placeLat = el.lat ?? el.center?.lat;
            const placeLng = el.lon ?? el.center?.lon;

            if (!placeLat || !placeLng) return null;

            // distance from user (Haversine, in metres)
            const R = 6371000;
            const dLat = (placeLat - parseFloat(lat)) * (Math.PI / 180);
            const dLng = (placeLng - parseFloat(lng)) * (Math.PI / 180);
            const a = Math.sin(dLat / 2) ** 2 +
                Math.cos(parseFloat(lat) * (Math.PI / 180)) *
                Math.cos(placeLat * (Math.PI / 180)) *
                Math.sin(dLng / 2) ** 2;
            const distanceM = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

            return {
                id:       el.id,
                name:     tags.name || info.label,
                type,
                label:    info.label,
                emoji:    info.emoji,
                lat:      placeLat,
                lng:      placeLng,
                distance: Math.round(distanceM),
                distanceText: distanceM < 1000
                    ? `${Math.round(distanceM)} m`
                    : `${(distanceM / 1000).toFixed(1)} km`,
                phone:    tags.phone || tags["contact:phone"] || null,
                address:  [tags["addr:housenumber"], tags["addr:street"], tags["addr:city"]]
                            .filter(Boolean).join(", ") || null,
                openingHours: tags.opening_hours || null,
                mapsUrl:  `https://maps.google.com/?q=${placeLat},${placeLng}`,
            };
        }).filter(Boolean).sort((a, b) => a.distance - b.distance);

        res.status(200).json({
            success: true,
            total: places.length,
            userLocation: { lat: parseFloat(lat), lng: parseFloat(lng) },
            radiusM: parseInt(radius),
            places,
        });

    } catch (err) {
        if (err.code === "ECONNABORTED") {
            return res.status(504).json({ message: "Overpass API timeout — try a smaller radius" });
        }
        res.status(500).json({ message: "Failed to fetch safe places", error: err.message });
    }
}));

module.exports = router;