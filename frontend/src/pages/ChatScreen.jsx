import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import Sidebar from "../Components/Dash/Sidebar";
import { useAuth } from "../context/auth";
import toast from "react-hot-toast";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const ChatScreen = () => {
  const [auth] = useAuth();
  const [emergencies, setEmergencies] = useState([]);
  const [selectedEmerg, setSelectedEmerg] = useState(null);
  const [chats, setChats] = useState([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);
  const pollRef = useRef(null);

  // Fetch all emergencies on load
  useEffect(() => {
    fetchEmergencies();
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats]);

  // Poll for new messages every 5 seconds
  useEffect(() => {
    if (selectedEmerg) {
      fetchChats(selectedEmerg);
      pollRef.current = setInterval(() => fetchChats(selectedEmerg), 5000);
    }
    return () => clearInterval(pollRef.current);
  }, [selectedEmerg]);

  const fetchEmergencies = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/v1/users/getselected`);
      setEmergencies(res.data.emergency || []);
    } catch (e) {
      console.error("Failed to fetch emergencies:", e);
    }
  };

  const fetchChats = async (emerg) => {
    if (!emerg) return;
    setLoading(true);
    try {
      const res = await axios.get(
        `${API_URL}/api/v1/chats/${auth?.user?._id}/emergncye/${emerg._id}`
      );
      setChats(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error("Failed to fetch chats:", e);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!message.trim()) {
      toast.error("Please type a message");
      return;
    }
    if (!selectedEmerg) {
      toast.error("Please select an emergency first");
      return;
    }

    setSending(true);
    try {
      await axios.post(`${API_URL}/api/v1/chats`, {
        senderId: auth?.user?._id,
        receiverId: selectedEmerg.userId,
        text: message.trim(),
        emergId: selectedEmerg._id,
      });
      setMessage("");
      await fetchChats(selectedEmerg);
      toast.success("Message sent!");
    } catch (e) {
      toast.error("Failed to send message");
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isAdminMessage = (chat) => {
    return chat.sender?.toString() === auth?.user?._id?.toString();
  };

  return (
    <div className="d-flex" style={{ minHeight: "100vh", background: "#f0f2f5" }}>
      <Sidebar />

      <div className="flex-grow-1 d-flex" style={{ overflow: "hidden" }}>

        {/* Emergency List Panel */}
        <div style={{
          width: "280px", background: "#1a1a2e", borderRight: "1px solid #2d2d4e",
          overflowY: "auto", flexShrink: 0
        }}>
          <div style={{ padding: "20px 15px 10px", borderBottom: "1px solid #2d2d4e" }}>
            <h6 style={{ color: "#a0a0c0", fontSize: "11px", fontWeight: "700",
              textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>
              🚨 Active Emergencies
            </h6>
          </div>

          {emergencies.length === 0 ? (
            <div style={{ padding: "30px 15px", textAlign: "center", color: "#666" }}>
              <div style={{ fontSize: "30px", marginBottom: "8px" }}>📭</div>
              <p style={{ fontSize: "13px" }}>No emergencies yet</p>
            </div>
          ) : (
            emergencies.map((emerg) => (
              <div
                key={emerg._id}
                onClick={() => setSelectedEmerg(emerg)}
                style={{
                  padding: "12px 15px", cursor: "pointer", borderBottom: "1px solid #2d2d4e",
                  background: selectedEmerg?._id === emerg._id ? "#2d2d4e" : "transparent",
                  transition: "background 0.2s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#2d2d4e"}
                onMouseLeave={e => {
                  if (selectedEmerg?._id !== emerg._id)
                    e.currentTarget.style.background = "transparent";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{
                    width: "40px", height: "40px", borderRadius: "50%",
                    background: emerg.isResolved ? "#28a745" : "#ff2d55",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "16px", flexShrink: 0
                  }}>
                    {emerg.isResolved ? "✅" : "🆘"}
                  </div>
                  <div style={{ overflow: "hidden" }}>
                    <div style={{ color: "#e0e0f0", fontWeight: "600", fontSize: "13px",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {emerg.username || "Unknown User"}
                    </div>
                    <div style={{ color: "#888", fontSize: "11px",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {emerg.addressOfInc || "Location unknown"}
                    </div>
                    <div style={{
                      display: "inline-block", marginTop: "3px", padding: "1px 8px",
                      borderRadius: "10px", fontSize: "10px", fontWeight: "700",
                      background: emerg.isResolved ? "#28a74522" : "#ff2d5522",
                      color: emerg.isResolved ? "#28a745" : "#ff2d55",
                      border: `1px solid ${emerg.isResolved ? "#28a745" : "#ff2d55"}44`
                    }}>
                      {emerg.isResolved ? "Resolved" : "Active"}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Chat Panel */}
        <div className="flex-grow-1 d-flex flex-column" style={{ overflow: "hidden" }}>

          {!selectedEmerg ? (
            // No emergency selected
            <div style={{ flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", color: "#888" }}>
              <div style={{ fontSize: "60px", marginBottom: "15px" }}>💬</div>
              <h5 style={{ color: "#555" }}>Select an Emergency</h5>
              <p style={{ fontSize: "14px" }}>
                Choose an emergency from the left panel to start chatting
              </p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div style={{
                background: "#1a1a2e", padding: "15px 20px",
                borderBottom: "1px solid #2d2d4e",
                display: "flex", alignItems: "center", gap: "12px"
              }}>
                <div style={{
                  width: "42px", height: "42px", borderRadius: "50%",
                  background: selectedEmerg.isResolved ? "#28a745" : "#ff2d55",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px"
                }}>
                  {selectedEmerg.isResolved ? "✅" : "🆘"}
                </div>
                <div>
                  <div style={{ color: "#e0e0f0", fontWeight: "700", fontSize: "15px" }}>
                    {selectedEmerg.username || "Unknown User"}
                  </div>
                  <div style={{ color: "#888", fontSize: "12px" }}>
                    📍 {selectedEmerg.addressOfInc || "Location unknown"} •{" "}
                    📞 {selectedEmerg.emergencyNo || "No phone"}
                  </div>
                </div>
                <div style={{ marginLeft: "auto" }}>
                  <span style={{
                    padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "700",
                    background: selectedEmerg.isResolved ? "#28a74522" : "#ff2d5522",
                    color: selectedEmerg.isResolved ? "#28a745" : "#ff2d55",
                    border: `1px solid ${selectedEmerg.isResolved ? "#28a745" : "#ff2d55"}44`
                  }}>
                    {selectedEmerg.isResolved ? "✅ Resolved" : "🔴 Active Emergency"}
                  </span>
                </div>
              </div>

              {/* Messages */}
              <div style={{
                flex: 1, overflowY: "auto", padding: "20px",
                display: "flex", flexDirection: "column", gap: "12px"
              }}>
                {loading && chats.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#888", padding: "40px" }}>
                    <div style={{ fontSize: "30px" }}>⏳</div>
                    <p>Loading messages...</p>
                  </div>
                ) : chats.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#888", padding: "40px" }}>
                    <div style={{ fontSize: "40px" }}>💬</div>
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  chats.map((chat, i) => {
                    const isAdmin = isAdminMessage(chat);
                    return (
                      <div key={i} style={{
                        display: "flex",
                        justifyContent: isAdmin ? "flex-end" : "flex-start",
                      }}>
                        {/* Victim avatar */}
                        {!isAdmin && (
                          <div style={{
                            width: "32px", height: "32px", borderRadius: "50%",
                            background: "#ff2d55", display: "flex", alignItems: "center",
                            justifyContent: "center", fontSize: "14px",
                            marginRight: "8px", flexShrink: 0, alignSelf: "flex-end"
                          }}>
                            🆘
                          </div>
                        )}

                        <div style={{
                          maxWidth: "65%",
                          background: isAdmin
                            ? "linear-gradient(135deg, #7B61FF, #a855f7)"
                            : "white",
                          color: isAdmin ? "white" : "#333",
                          borderRadius: isAdmin ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                          padding: "10px 14px",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                        }}>
                          <div style={{ fontSize: "13px", lineHeight: "1.5" }}>
                            {chat.textChat}
                          </div>
                          <div style={{
                            fontSize: "10px", marginTop: "4px",
                            opacity: 0.7, textAlign: "right"
                          }}>
                            {isAdmin ? "You (Admin)" : selectedEmerg.username} • {formatTime(chat.createdAt)}
                          </div>
                        </div>

                        {/* Admin avatar */}
                        {isAdmin && (
                          <div style={{
                            width: "32px", height: "32px", borderRadius: "50%",
                            background: "#7B61FF", display: "flex", alignItems: "center",
                            justifyContent: "center", fontSize: "14px",
                            marginLeft: "8px", flexShrink: 0, alignSelf: "flex-end"
                          }}>
                            👮
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Message Input */}
              <div style={{
                background: "white", borderTop: "1px solid #eee",
                padding: "15px 20px", display: "flex", gap: "10px", alignItems: "flex-end"
              }}>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message... (Enter to send)"
                  rows={2}
                  style={{
                    flex: 1, border: "1px solid #ddd", borderRadius: "12px",
                    padding: "10px 14px", fontSize: "14px", resize: "none",
                    outline: "none", fontFamily: "inherit",
                  }}
                />
                <button
                  onClick={sendMessage}
                  disabled={sending || !message.trim()}
                  style={{
                    padding: "10px 20px", borderRadius: "12px", border: "none",
                    background: sending || !message.trim()
                      ? "#ccc"
                      : "linear-gradient(135deg, #7B61FF, #a855f7)",
                    color: "white", fontWeight: "bold", cursor: sending ? "not-allowed" : "pointer",
                    fontSize: "14px", whiteSpace: "nowrap", height: "44px"
                  }}
                >
                  {sending ? "⏳" : "Send 📨"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatScreen;