import React, { useEffect, useState } from 'react'
import { API_URL } from "../../config";
import '../../styles/auth.css'
import { Link, useNavigate } from 'react-router-dom'
import register from '../../images/register.png'
import axios from 'axios'
import toast from 'react-hot-toast';

const Register = () => {
    const navigate = useNavigate()
    const [uname, setName] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [password, setPassword] = useState('')
    const [emergencyNo, setEmrNumber] = useState('')
    const [emergencyMail, setEmrEmail] = useState('')
    const [pincode, setPincode] = useState('')

    const validateEmail = (email) => {
        const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
        return emailPattern.test(email);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!uname.trim()) { toast.error('Name is required'); return false; }
        if (!email.trim()) { toast.error('Email is required'); return false; }
        if (!validateEmail(email)) { toast.error('Invalid Email Format'); return false; }
        if (!phone.trim()) { toast.error('Phone Number is required'); return false; }
        if (!password.trim()) { toast.error('Password is required'); return false; }
        if (!emergencyNo.trim()) { toast.error('Emergency Number is required'); return false; }
        if (phone === emergencyNo) { toast.error('Emergency Phone and Personal Phone must be different'); return false; }
        if (!emergencyMail.trim()) { toast.error('Emergency Email is required'); return false; }
        if (email === emergencyMail) { toast.error('Emergency Email and Personal Email must be different'); return false; }
        if (!pincode.trim()) { toast.error('PinCode is required'); return false; }

        try {
            const res = await axios.post(`${API_URL}/api/v1/users/register`, {
                uname, email, phone, password, emergencyNo, emergencyMail, pincode
            });
            if (res.status === 201) {
                toast.success('Registered Successfully!')
                navigate('/login')
            }
            if (res.status === 400) {
                toast.error('Email Already Exists! Please Login')
            }
        } catch (err) {
            toast.error("Error While Registering");
            console.log(err)
        }
    }

    useEffect(() => {
        window.scrollTo(0, 0)
    }, [])

    return (
        <div className='my-5'>
            <div className="container d-flex justify-content-center align-items-center">
                <div className="row border rounded-5 p-3 bg-white shadow box-area reverseCol">
                    <div className="col-md-6 rounded-4 d-flex justify-content-center align-items-center flex-column left-box">
                        <div className="featured-image mb-3 animateImg">
                            <img src={register} className="img-fluid mt-5" width={500} alt="register" />
                        </div>
                    </div>
                    <div className="col-md-6 right-box">
                        <div className="row align-items-center">
                            <div className="header-text mb-2">
                                <h2>Welcome</h2>
                                <p>We are happy to have you here</p>
                            </div>
                            <div className="input-group d-flex flex-row align-items-center mb-3">
                                <div className="form-outline flex-fill mb-0">
                                    <input value={uname} type="text" onChange={(e) => setName(e.target.value)} className="form-control form-control-lg border-dark fs-6" placeholder="Full Name" required />
                                </div>
                            </div>
                            <div className="input-group d-flex align-items-center mb-3">
                                <div className="form-outline flex-fill mb-0">
                                    <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="form-control form-control-lg border-dark fs-6" placeholder="Email Address" required />
                                </div>
                            </div>
                            <div className="input-group d-flex align-items-center mb-3">
                                <div className="form-outline flex-fill mb-0">
                                    <input type="number" value={phone} onChange={(e) => setPhone(e.target.value)} className="form-control form-control-lg border-dark fs-6" placeholder="Phone Number" required />
                                </div>
                            </div>
                            <div className="input-group d-flex flex-row align-items-center mb-3">
                                <div className="form-outline flex-fill mb-0">
                                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="form-control form-control-lg border-dark fs-6" placeholder="Password" required />
                                </div>
                            </div>
                            <div className="input-group d-flex flex-row align-items-center mb-3">
                                <div className="form-outline flex-fill mb-0">
                                    <input value={emergencyNo} type="number" onChange={(e) => setEmrNumber(e.target.value)} className="form-control form-control-lg border-dark fs-6" placeholder="Emergency Number" required />
                                </div>
                            </div>
                            <div className="input-group d-flex flex-row align-items-center mb-3">
                                <div className="form-outline flex-fill mb-0">
                                    <input value={emergencyMail} type="email" onChange={(e) => setEmrEmail(e.target.value)} className="form-control form-control-lg border-dark fs-6" placeholder="Emergency Email" required />
                                </div>
                            </div>
                            <div className="input-group d-flex flex-row align-items-center mb-3">
                                <div className="form-outline flex-fill mb-0">
                                    <input value={pincode} type="number" onChange={(e) => setPincode(e.target.value)} className="form-control form-control-lg border-dark fs-6" placeholder="Pincode" required />
                                </div>
                            </div>
                            <div className="d-flex flex-row align-items-center mt-4">
                                <div className="form-outline flex-fill mb-0">
                                    <button className="btn btn-lg text-white" onClick={handleSubmit} type="button" style={{ backgroundColor: 'blueviolet', width: '100%' }}>
                                        Register
                                    </button>
                                </div>
                            </div>
                            <div className="d-flex flex-row align-items-center my-3">
                                <div className="form-outline flex-fill mb-0">
                                    <Link to='/login' className="btn btn-outline-dark btn-lg btn-block" style={{ width: '100%' }}>
                                        Login
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Register