import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../context/auth'
import toast from 'react-hot-toast'
import reports from '../images/report.png'
import Navbar from '../Components/Navbar/Navbar'
import Footer from '../Components/Footer/Footer'
import { API_URL } from '../config'

const Report = () => {
    const [report, setReport] = useState('')
    const [pincodeOfIncident, setpincodeOfIncident] = useState('')
    const [address, setAddress] = useState('')
    const [lat, setLat] = useState(null)
    const [lng, setLng] = useState(null)
    const [locationStatus, setLocationStatus] = useState('Detecting your location...')
    const [auth] = useAuth()

    // Auto-detect GPS location when page loads
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLat(position.coords.latitude)
                    setLng(position.coords.longitude)
                    setLocationStatus('✅ Location detected!')
                },
                (error) => {
                    setLocationStatus('⚠️ Location not available')
                    console.log('Location error:', error)
                }
            )
        } else {
            setLocationStatus('⚠️ Location not supported')
        }
    }, [])

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!report.trim()) {
            toast.error('Report is Required!')
            return false
        }
        if (!pincodeOfIncident.trim()) {
            toast.error('PinCode is Required!')
            return false
        }
        if (!address.trim()) {
            toast.error('Address is Required!')
            return false
        }

        try {
            const res = await axios.post(
    `${API_URL}/api/v1/incidents`,
    {
        report,
        pincodeOfIncident,
        address,
        lat,
        lng,
        user: auth?.user?._id  // ← add this line
    },
    {
        headers: {
            Authorization: `Bearer ${auth?.token}`
        }
    }
);

            if (res.status === 201) {
                toast.success('Incident Reported Successfully!')
                setReport('')
                setpincodeOfIncident('')
                setAddress('')
            }
        } catch (err) {
            toast.error('Error in Sending Report')
            console.log(err)
        }
    }

    return (
        <>
            <Navbar />
            <div className='marginStyle'>
                <div className="container d-flex justify-content-center align-items-center">
                    <div className="row border rounded-5 p-3 bg-white shadow box-area reverseCol">
                        <div className="col-md-6 rounded-4 d-flex justify-content-center align-items-center flex-column left-box">
                            <div className="featured-image mb-3 animateImg">
                                <img src={reports} className="img-fluid" alt="report" />
                            </div>
                        </div>
                        <form method='post' className="col-md-6 right-box">
                            <div className="row align-items-center">
                                <div className="header-text mb-4">
                                    <h2>Incident report</h2>
                                    <p>We us your Incident, we will take action against it!</p>
                                </div>

                                {/* Location Status */}
                                <div style={{
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    marginBottom: '15px',
                                    fontSize: '13px',
                                    background: lat ? '#e8f5e9' : '#fff3e0',
                                    color: lat ? '#2e7d32' : '#e65100'
                                }}>
                                    📍 {locationStatus}
                                    {lat && <span> ({lat.toFixed(4)}, {lng.toFixed(4)})</span>}
                                </div>

                                <div className="input-group d-flex flex-row align-items-center mb-3">
                                    <div className="form-outline flex-fill mb-0">
                                        <input
                                            type="number"
                                            value={pincodeOfIncident}
                                            onChange={(e) => setpincodeOfIncident(e.target.value)}
                                            className="form-control form-control-lg border-dark fs-6"
                                            placeholder="Enter the PinCode of the Incident"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="input-group d-flex flex-row align-items-center mb-3">
                                    <div className="form-outline flex-fill mb-0">
                                        <textarea
                                            rows={3}
                                            value={report}
                                            onChange={(e) => setReport(e.target.value)}
                                            className="form-control form-control-lg border-dark fs-6"
                                            placeholder="Write the Report of the Incident"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="input-group d-flex flex-row align-items-center mb-3">
                                    <div className="form-outline flex-fill mb-0">
                                        <textarea
                                            rows={3}
                                            value={address}
                                            onChange={(e) => setAddress(e.target.value)}
                                            className="form-control form-control-lg border-dark fs-6"
                                            placeholder="Enter the Address of the Incident"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="d-flex flex-row align-items-center my-3">
                                    <div className="form-outline flex-fill mb-0">
                                        <button
                                            className='btn text-white btn-lg btn-block'
                                            onClick={handleSubmit}
                                            style={{ width: '100%', backgroundColor: 'blueviolet' }}
                                            type="submit"
                                        >
                                            Submit Incident
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            <Footer />
        </>
    )
}

export default Report
