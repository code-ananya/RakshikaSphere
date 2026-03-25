import React, { useEffect, useState } from 'react'
import "../styles/Profile.css"
import Navbar from '../Components/Navbar/Navbar'
import Footer from '../Components/Footer/Footer'
import { useAuth } from '../context/auth'
import toast from 'react-hot-toast'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../config'

const Profile = () => {
  const [auth, setAuth] = useAuth();
  const [uid, setUid] = useState("")
  const [uname, setuname] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNo, setphoneNo] = useState("");
  const [address, setaddress] = useState("");
  const [pinCode, setpinCode] = useState("");
  const [emergencyMail, setemergencyMail] = useState("");
  const [emergencyNo, setemergencyNo] = useState("");
  const [extraEmail1, setextraEmail1] = useState("");
  const [extraEmail2, setextraEmail2] = useState("");
  const [extraPhone1, setextraPhone1] = useState("");
  const [extraPhone2, setextraPhone2] = useState("");
  const navigate = useNavigate()

  useEffect(() => {
    if (!auth?.user) return;
    const {
      _id, uname, email, phoneNo, address, pinCode,
      emergencyMail, emergencyNo, extraEmail1, extraEmail2,
      extraPhone1, extraPhone2
    } = auth.user;
    setUid(_id || "")
    setuname(uname || "");
    setEmail(email || "");
    setphoneNo(phoneNo || "");
    setaddress(address || "");
    setpinCode(pinCode || "");
    setemergencyMail(emergencyMail || "");
    setemergencyNo(emergencyNo || "");
    setextraEmail1(extraEmail1 || "");
    setextraEmail2(extraEmail2 || "");
    setextraPhone1(extraPhone1 || "");
    setextraPhone2(extraPhone2 || "");
    window.scrollTo(0, 0);
  }, [auth?.user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.put(`${API_URL}/api/v1/users/update`, {
        uid,
        uname,
        email,
        phoneNo,
        address,
        pinCode,
        emergencyMail,
        emergencyNo,
        extraEmail1,
        extraEmail2,
        extraPhone1,
        extraPhone2
      }, {
        headers: {
          Authorization: `Bearer ${auth?.token}`
        }
      });

      if (data?.error) {
        toast.error(data?.error);
      } else {
        // Update local auth state and localStorage
        const updatedUser = data?.updatedUser || { ...auth.user, uname, email, phoneNo, address, pinCode, emergencyMail, emergencyNo };
        setAuth({ ...auth, user: updatedUser });
        let ls = localStorage.getItem("auth");
        if (ls) {
          ls = JSON.parse(ls);
          ls.user = updatedUser;
          localStorage.setItem("auth", JSON.stringify(ls));
        }
        toast.success("Profile Updated Successfully");
      }
    } catch (error) {
      console.log(error);
      toast.error("Something went wrong");
    }
  };

  return (
    <div>
      <Navbar />
      <div className="container marginStyle">
        <div className="main-body">
          <div className="row gutters-sm">

            {/* Left profile card */}
            <div className="col-md-4 mb-3">
              <div className="card">
                <div className="card-body">
                  <div className="d-flex flex-column align-items-center text-center">
                    <img
                      src="https://bootdey.com/img/Content/avatar/avatar7.png"
                      alt="Profile"
                      className="rounded-circle"
                      width={150}
                    />
                    <div className="mt-3">
                      <h4>{auth?.user?.uname}</h4>
                      <p className="text-muted font-size-sm">
                        Pincode: {auth?.user?.pinCode}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right form */}
            <div className="col-md-8">
              <div className="card mb-3">
                <div className="card-body">

                  {/* Full Name */}
                  <div className="row">
                    <div className="col-sm-3">
                      <h6 className="mb-0">Full Name</h6>
                    </div>
                    <div className="col-sm-9 text-secondary">
                      <input
                        value={uname}
                        onChange={(e) => setuname(e.target.value)}
                        type="text"
                        className="form-control"
                        placeholder="Full Name"
                        required
                      />
                    </div>
                  </div>
                  <hr />

                  {/* Email */}
                  <div className="row">
                    <div className="col-sm-3">
                      <h6 className="mb-0">Email</h6>
                    </div>
                    <div className="col-sm-9 text-secondary">
                      <input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        type="email"
                        className="form-control"
                        placeholder="Email"
                        required
                      />
                    </div>
                  </div>
                  <hr />

                  {/* Emergency Emails */}
                  <div className="row">
                    <div className="col-sm-3">
                      <h6 className="mb-0">Emergency Email</h6>
                    </div>
                    <div className="col-sm-9 text-secondary mb-2">
                      <input
                        value={emergencyMail}
                        onChange={(e) => setemergencyMail(e.target.value)}
                        type="email"
                        className="form-control"
                        placeholder="Emergency Email"
                        required
                      />
                    </div>
                    <div className="col-sm-3">
                      <h6 className="mb-0">Extra Email 1</h6>
                    </div>
                    <div className="col-sm-9 text-secondary mb-2">
                      <input
                        value={extraEmail1}
                        onChange={(e) => setextraEmail1(e.target.value)}
                        type="email"
                        className="form-control"
                        placeholder="Extra Email 1 (optional)"
                      />
                    </div>
                    <div className="col-sm-3">
                      <h6 className="mb-0">Extra Email 2</h6>
                    </div>
                    <div className="col-sm-9 text-secondary">
                      <input
                        value={extraEmail2}
                        onChange={(e) => setextraEmail2(e.target.value)}
                        type="email"
                        className="form-control"
                        placeholder="Extra Email 2 (optional)"
                      />
                    </div>
                  </div>
                  <hr />

                  {/* Phone Numbers */}
                  <div className="row">
                    <div className="col-sm-3">
                      <h6 className="mb-0">Phone</h6>
                    </div>
                    <div className="col-sm-9 text-secondary mb-2">
                      <input
                        value={phoneNo}
                        onChange={(e) => setphoneNo(e.target.value)}
                        type="tel"
                        className="form-control"
                        placeholder="Phone Number"
                        required
                      />
                    </div>
                    <hr />
                    <div className="col-sm-3">
                      <h6 className="mb-0">Emergency Phone</h6>
                    </div>
                    <div className="col-sm-9 text-secondary mb-2">
                      <input
                        value={emergencyNo}
                        onChange={(e) => setemergencyNo(e.target.value)}
                        type="tel"
                        className="form-control"
                        placeholder="Emergency Phone"
                        required
                      />
                    </div>
                    <div className="col-sm-3">
                      <h6 className="mb-0">Extra Phone 1</h6>
                    </div>
                    <div className="col-sm-9 text-secondary mb-2">
                      <input
                        value={extraPhone1}
                        onChange={(e) => setextraPhone1(e.target.value)}
                        type="tel"
                        className="form-control"
                        placeholder="Extra Phone 1 (optional)"
                      />
                    </div>
                    <div className="col-sm-3">
                      <h6 className="mb-0">Extra Phone 2</h6>
                    </div>
                    <div className="col-sm-9 text-secondary">
                      <input
                        value={extraPhone2}
                        onChange={(e) => setextraPhone2(e.target.value)}
                        type="tel"
                        className="form-control"
                        placeholder="Extra Phone 2 (optional)"
                      />
                    </div>
                  </div>
                  <hr />

                  {/* Address & Pincode */}
                  <div className="row">
                    <div className="col-sm-3">
                      <h6 className="mb-0">Address</h6>
                    </div>
                    <div className="col-sm-9 text-secondary mb-2">
                      <input
                        value={address}
                        onChange={(e) => setaddress(e.target.value)}
                        type="text"
                        className="form-control"
                        placeholder="Address"
                      />
                    </div>
                    <div className="col-sm-3">
                      <h6 className="mb-0">Pincode</h6>
                    </div>
                    <div className="col-sm-9 text-secondary">
                      <input
                        value={pinCode}
                        onChange={(e) => setpinCode(e.target.value)}
                        type="text"
                        className="form-control"
                        placeholder="Pincode"
                      />
                    </div>
                  </div>
                  <hr />

                  {/* Submit */}
                  <div className="row">
                    <div className="col-sm-12">
                      <button
                        onClick={handleSubmit}
                        className="btn btn-outline-dark"
                        style={{ minWidth: "120px" }}
                      >
                        Update Profile
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}

export default Profile