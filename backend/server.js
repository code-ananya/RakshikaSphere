const express = require("express");
const errorHandler = require("./middlewares/errorHandler");
const connectDB = require("./database/db");
const cors = require("cors");
const userRoutes = require("./routes/userRoutes");
const incRoutes = require("./routes/incidentRoutes");
const emergencyRoutes = require("./routes/emergencyRoutes");
const chatRoutes = require('./routes/chatRoutes')
require("dotenv").config();

const app = express();
const port = process.env.PORT || 8000;

app.use(express.json());
app.use(cors());

const start = async () => {
  try {
    await connectDB(process.env.MONGO_URI);
    app.listen(port, () => {
      console.log(`Server started on ${port}`);
      console.log(`Mongo Connected!!!`);
    });
  } catch (err) {
    console.log(err);
  }
};
const dangerZoneRoutes = require("./routes/dangerZoneRoutes");
const classifierRoutes = require("./routes/classifierRoutes");
const safeRouteRoutes = require("./routes/safeRouteRoutes");
const violenceRoutes = require("./routes/violenceRoutes");
const fakeCallRoutes = require("./routes/fakeCallRoutes");
const sosRoutes = require("./routes/sosRoutes");
const safePlacesRoutes = require("./routes/safePlacesRoutes");
app.use("/api/v1/safeplaces", safePlacesRoutes);
app.use("/api/v1/sos", sosRoutes);
app.use("/api/v1/fakecall", fakeCallRoutes);
app.use("/api/v1/violence", violenceRoutes);
app.use("/api/v1/saferoute", safeRouteRoutes);
app.use("/api/v1/classifier", classifierRoutes);
app.use("/api/v1/dangerzones", dangerZoneRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/incidents", incRoutes);
app.use("/api/v1/emergency", emergencyRoutes);
app.use('/api/v1/chats',chatRoutes)

app.use(errorHandler);

start();
