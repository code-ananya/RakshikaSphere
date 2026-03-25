import React, { useEffect, useState } from "react";
import { API_URL } from "../config";
import Sidebar from "../Components/Dash/Sidebar";
import { useAuth } from "../context/auth";

const Dashboard = (props) => {
  const [auth, setAuth] = useAuth();
  const [emerg, setEmer] = useState([]);
  const [chats, setChats] = useState([]);
  const [txt, setTxt] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/users/getselected`, {
        method: "GET",
        headers: { "Content-type": "application/json" },
      });
      if (res.status === 200) {
        const data = await res.json();
        setEmer(data?.emergency || []);
      }
    } catch (e) {
      console.log(e);
    }
  };

  const getChats = async (emerge) => {
    try {
      const res = await fetch(`${API_URL}/api/v1/chats/${auth?.user?._id}/emerg/${emerge}`, {
        method: "GET",
        headers: { "Content-type": "application/json" },
      });
      if (res.status === 200) {
        const data = await res.json();
        if (data) setChats(data);
      }
    } catch (e) {
      console.log(e);
    }
  };

  const addChat = async (receiverId, emergId) => {
    try {
      const payload = {
        senderId: auth?.user?._id,
        receiverId: receiverId,
        text: txt,
        emergId: emergId,
      };
      const res = await fetch(`${API_URL}/api/v1/chats`, {
        method: "POST",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status === 201) {
        alert("Chat added");
        setTxt("");
      }
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <div className="d-flex justify-content-start">
      <Sidebar />
      <div className="container table-responsive mx-3">
        <div className="features_wrapper" style={{ marginTop: "-50px" }}>
          <div className="row">
            <div className="col-12 text-center">
              <p className="features_subtitle">Latest Women Emergency Alert!</p>
              <h2 className="features_title">Women Emergency Data</h2>
            </div>
          </div>
        </div>
        <table
          className="table table-striped table-bordered table-hover"
          style={{ marginTop: "-50px" }}
        >
          <thead className="table-dark text-center">
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Address of Incident</th>
              <th scope="col">Map View</th>
              <th scope="col">Emergency No.</th>
              <th scope="col">Chat with Victim</th>
            </tr>
          </thead>
          <tbody className="text-center">
            {emerg.map((ee, index) => (
              <React.Fragment key={index}>
                <tr>
                  <th scope="row">{ee.username}</th>
                  <td>{ee.addressOfInc}</td>
                  <td>
                    <a href={`${ee.mapLct}`} target="_blank" rel="noreferrer">
                      <button className="btn btn-primary">View in Map</button>
                    </a>
                  </td>
                  <td>{ee.emergencyNo}</td>
                  <td>
                    <button
                      className="btn btn-dark"
                      data-bs-toggle="modal"
                      data-bs-target={`#chatModal${index}`}
                      onClick={() => getChats(ee._id)}
                    >
                      Chat
                    </button>
                  </td>
                </tr>

                {/* Chat Modal */}
                <div
                  className="modal fade"
                  id={`chatModal${index}`}
                  tabIndex="-1"
                  aria-labelledby={`chatModalLabel${index}`}
                  aria-hidden="true"
                >
                  <div className="modal-dialog">
                    <div className="modal-content">
                      <div className="modal-header">
                        <h1
                          className="modal-title fs-5"
                          id={`chatModalLabel${index}`}
                        >
                          Chat with {ee.username}
                        </h1>
                        <button
                          type="button"
                          className="btn-close"
                          data-bs-dismiss="modal"
                          aria-label="Close"
                        ></button>
                      </div>
                      <div className="modal-body">
                        <div
                          style={{
                            maxHeight: "200px",
                            overflowY: "auto",
                            marginBottom: "10px",
                          }}
                        >
                          {chats.length > 0 ? (
                            chats.map((chat, i) => (
                              <div
                                key={i}
                                className={`d-flex justify-content-${
                                  chat.senderId === auth?.user?._id
                                    ? "end"
                                    : "start"
                                }`}
                              >
                                <p
                                  style={{
                                    background:
                                      chat.senderId === auth?.user?._id
                                        ? "#7B61FF"
                                        : "#f0f0f0",
                                    color:
                                      chat.senderId === auth?.user?._id
                                        ? "white"
                                        : "#333",
                                    padding: "8px 12px",
                                    borderRadius: "10px",
                                    maxWidth: "70%",
                                  }}
                                >
                                  {chat.text}
                                </p>
                              </div>
                            ))
                          ) : (
                            <p className="text-muted text-center">
                              No messages yet
                            </p>
                          )}
                        </div>
                        <div className="d-flex">
                          <input
                            className="form-control mx-3"
                            value={txt}
                            onChange={(e) => setTxt(e.target.value)}
                            type="text"
                            placeholder="Enter your message"
                            onKeyDown={(e) =>
                              e.key === "Enter" && addChat(ee.userId, ee._id)
                            }
                          />
                          <button
                            className="btn btn-primary"
                            onClick={() => addChat(ee.userId, ee._id)}
                          >
                            Send
                          </button>
                        </div>
                      </div>
                      <div className="modal-footer">
                        <button
                          type="button"
                          className="btn btn-secondary"
                          data-bs-dismiss="modal"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </React.Fragment>
            ))}
          </tbody>
        </table>

        {emerg.length === 0 && (
          <div className="text-center py-5 text-muted">
            <p>No emergency alerts at this time.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;