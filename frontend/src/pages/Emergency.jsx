import React, { useState, useEffect } from "react";
import { API_URL } from "../config";
import { Link } from "react-router-dom";
import "../styles/Emergency.css";
import { PiSirenBold } from "react-icons/pi";
import Parallelx from "../Components/Parallelx";
import Navbar from "../Components/Navbar/Navbar";
import Footer from "../Components/Footer/Footer";
import { useAuth } from "../context/auth";
import toast from "react-hot-toast";

const Emergency = () => {
  const [long, setLong] = useState("");
  const [lat, setLat] = useState("");
  const [auth] = useAuth();
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!lat || !long) {
      toast.error("Getting your location... Please try again in a moment!");
      getLocation();
      return;
    }

    setSending(true);
    try {
      const payload = {
        userId: auth?.user?._id,
        lat,
        long,
      };

      const res = await fetch(`${API_URL}/api/v1/emergency/emergencypressed`, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-type": "application/json" },
      });

      if (res.status === 200) {
        toast.success("🚨 SOS SENT SUCCESSFULLY!");
      } else {
        toast.error("SOS FAILED — Please try again");
      }
    } catch (e) {
      console.log(e);
      toast.error("Something went wrong");
    } finally {
      setSending(false);
    }
  };

  const showPosition = (position) => {
    setLat(position.coords.latitude);
    setLong(position.coords.longitude);
  };

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(showPosition, (err) => {
        console.log("Location error:", err);
        toast.error("Could not get location — please enable GPS");
      });
    } else {
      toast.error("Geolocation not supported by your browser");
    }
  };

  useEffect(() => {
    getLocation();
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <Navbar />
      <div className="heightRes">
        <section className="banner_wrapper">
          <div className="container">
            <div className="row align-items-center">
              <div className="col-md-12 my-5 my-md-0 text-center text-md-start">
                <p className="banner-subtitle" style={{ textAlign: "center" }}>
                  Your Safety our Priority
                </p>
                <h1
                  className="banner-title mb-5"
                  style={{ textAlign: "center" }}
                >
                  Help us bring <span>Women Safety</span> to Reality with us
                </h1>

                {/* Location status */}
                <div
                  style={{
                    textAlign: "center",
                    marginBottom: "16px",
                    fontSize: "14px",
                    color: lat ? "#22c55e" : "#f59e0b",
                  }}
                >
                  📍{" "}
                  {lat
                    ? `Location ready (${parseFloat(lat).toFixed(4)}, ${parseFloat(long).toFixed(4)})`
                    : "Detecting your location..."}
                </div>

                <center>
                  <button
                    className="button-30 text-center"
                    onClick={handleSubmit}
                    disabled={sending}
                    style={{ opacity: sending ? 0.7 : 1 }}
                  >
                    <PiSirenBold size={200} className="text-white" />
                  </button>
                  {sending && (
                    <p style={{ color: "white", marginTop: "12px" }}>
                      Sending SOS...
                    </p>
                  )}
                </center>
              </div>
            </div>
          </div>
        </section>
      </div>
      <Parallelx />
      <Footer />
    </>
  );
};

export default Emergency;