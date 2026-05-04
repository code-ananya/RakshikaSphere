import React, { useEffect, useState } from 'react'
import { API_URL } from "../../config";
import '../../styles/auth.css'
import { Link, useNavigate } from 'react-router-dom'
import login from '../../images/login.png'
import axios from 'axios'
import toast from 'react-hot-toast';
import { useAuth } from '../../context/auth'

const Login = () => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [auth, setAuth] = useAuth()
    const navigate = useNavigate()

    const validateEmail = (email) => {
        const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
        return emailPattern.test(email);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        // ✅ Check empty first, then format
if (!email.trim()) {
    toast.error('Email is required');
    return false;
}
if (!validateEmail(email)) {
    toast.error('Invalid Email Format');
    return false;
}
if (!password.trim()) {
    toast.error('Password is required');
    return false;
}
        try {
            const res = await axios.post(`${API_URL}/api/v1/users/login`, {
                email, password
            });
            if (res.status === 200) {
                toast.success('Login Successfully')
                setAuth({
                    ...auth,
                    user: res.data.user,
                    token: res.data.token
                })
                localStorage.setItem('auth', JSON.stringify(res.data))
                navigate('/')
            }
        } catch (err) {
            toast.error('Invalid Email or Password');
        }
    }

    useEffect(() => {
        window.scrollTo(0, 0)
    }, [])

    return (
        <div className='marginStyle'>
            <div className="container d-flex justify-content-center align-items-center">
                <div className="row border rounded-5 p-3 bg-white shadow box-area reverseCol">
                    <div className="col-md-6 rounded-4 d-flex justify-content-center align-items-center flex-column left-box">
                        <div className="featured-image mb-3 animateImg">
                            <img src={login} className="img-fluid" width={500} alt="login" />
                        </div>
                    </div>
                    <div className="col-md-6 right-box">
                        <div className="row align-items-center">
                            <div className="header-text mb-4">
                                <h2>Welcome</h2>
                                <p>We are happy to have you back</p>
                            </div>
                            <div className="input-group d-flex align-items-center mb-3">
                                <div className="form-outline flex-fill mb-0">
                                    <input
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        type="email"
                                        className="form-control form-control-lg border-dark fs-6"
                                        placeholder="Email Address"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="input-group d-flex flex-row align-items-center mb-3">
                                <div className="form-outline flex-fill mb-0">
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="form-control form-control-lg border-dark fs-6"
                                        placeholder="Password"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="d-flex flex-row align-items-center mt-4">
                                <div className="form-outline flex-fill mb-0">
                                    <button
                                        className="btn btn-lg text-white"
                                        type="button"
                                        onClick={handleSubmit}
                                        style={{ backgroundColor: 'blueviolet', width: '100%' }}
                                    >
                                        Login
                                    </button>
                                </div>
                            </div>
                            <div className="d-flex flex-row align-items-center my-3">
                                <div className="form-outline flex-fill mb-0">
                                    <Link
                                        to='/register'
                                        className="btn btn-outline-dark btn-lg btn-block"
                                        style={{ width: '100%' }}
                                    >
                                        Register
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

export default Login