require("dotenv").config();

const express = require("express");
const errorHandler = require("./middlewares/errorHandler");
const connectDB = require("./database/db");
const cors = require("cors");
const path = require("path");

const userRoutes = require("./routes/userRoutes");
const incRoutes = require("./routes/incidentRoutes");
const emergencyRoutes = require("./routes/emergencyRoutes");
const chatRoutes = require("./routes/chatRoutes");
const dangerZoneRoutes = require("./routes/dangerZoneRoutes");
const classifierRoutes = require("./routes/classifierRoutes");
const safeRouteRoutes = require("./routes/safeRouteRoutes");
const violenceRoutes = require("./routes/violenceRoutes");
const fakeCallRoutes = require("./routes/fakeCallRoutes");
const sosRoutes = require("./routes/sosRoutes");
const safePlacesRoutes = require("./routes/safePlacesRoutes");
const evidenceRoutes = require("./routes/evidenceRoutes");

const app = express();
const port = process.env.PORT || 5000;

// ── CORS ──────────────────────────────────────────────────────
const allowedOrigins = [
  "https://rakshika-sphere-l54g.vercel.app",
  "https://rakshika-sphere.vercel.app",
  "http://localhost:3000",
  "http://localhost:5173",
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    // ✅ Allow any Vercel preview deploy for your project
    const isVercelPreview = /^https:\/\/rakshika-sphere.*\.vercel\.app$/.test(origin);

    if (allowedOrigins.includes(origin) || isVercelPreview) {
      return callback(null, true);
    }

    console.warn("CORS blocked origin:", origin);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["Authorization"],
}));

app.options("*", cors());
app.options("*", cors());
// ── Middleware ────────────────────────────────────────────────
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Routes ────────────────────────────────────────────────────
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/incidents", incRoutes);
app.use("/api/v1/emergency", emergencyRoutes);
app.use("/api/v1/chats", chatRoutes);
app.use("/api/v1/dangerzones", dangerZoneRoutes);
app.use("/api/v1/classifier", classifierRoutes);
app.use("/api/v1/saferoute", safeRouteRoutes);
app.use("/api/v1/violence", violenceRoutes);
app.use("/api/v1/fakecall", fakeCallRoutes);
app.use("/api/v1/sos", sosRoutes);
app.use("/api/v1/safeplaces", safePlacesRoutes);
app.use("/api/v1/evidence", evidenceRoutes);

// ── Health check ──────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ status: "RakshikaSphere Backend Running ✅" });
});

// ── Error Handler ─────────────────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────
const start = async () => {
  try {
    await connectDB(process.env.MONGO_URI);
    app.listen(port, () => {
      console.log(`Server started on port ${port}`);
      console.log(`Mongo Connected!!!`);
    });
  } catch (err) {
    console.log(err);
  }
};

start();