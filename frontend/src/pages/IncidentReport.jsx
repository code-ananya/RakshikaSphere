import React, { useState, useEffect } from "react";
import { API_URL } from "../config";
import Sidebar from "../Components/Dash/Sidebar";
import axios from "axios";

const IncidentReport = () => {
  const [incidentreport, setincidentreport] = useState([]);
  const [loading, setLoading] = useState(true);

  const getAllIncident = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API_URL}/api/v1/incidents`);
      if (data) {
        setincidentreport(data?.incidents || data || []);
      }
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getAllIncident();
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="d-flex justify-content-start">
      <Sidebar />
      <div className="container table-responsive mx-3">
        <div className="features_wrapper" style={{ marginTop: "-50px" }}>
          <div className="row">
            <div className="col-12 text-center">
              <p className="features_subtitle">Latest Women Incident Reported!</p>
              <h2 className="features_title">Women Incident Data</h2>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-5">
            <p className="text-muted">Loading incidents...</p>
          </div>
        ) : (
          <table
            className="table table-striped table-bordered table-hover"
            style={{ marginTop: "-50px" }}
          >
            <thead className="table-dark text-center">
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Report</th>
                <th scope="col">Address</th>
                <th scope="col">Pincode</th>
                <th scope="col">Date</th>
              </tr>
            </thead>
            <tbody className="text-center">
              {incidentreport.length > 0 ? (
                incidentreport.map((p, index) => (
                  <tr key={index}>
                    <th scope="row">{p.uname || "Anonymous"}</th>
                    <td>{p.report}</td>
                    <td>{p.address || "N/A"}</td>
                    <td>{p.pincodeOfIncident || p.pincode || "N/A"}</td>
                    <td>
                      {p.createdAt
                        ? new Date(p.createdAt).toLocaleDateString()
                        : "N/A"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-muted py-4">
                    No incidents reported yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default IncidentReport;