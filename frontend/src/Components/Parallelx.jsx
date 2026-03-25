import React from 'react'
import '../styles/parallelx.css'
import { Link } from 'react-router-dom'

const Parallelx = () => {
    return (
        <div>
            <section className="more-info-section bg-color">
                <section className="container ">
                    <div className="row">
                        <div className="col-xl-6 xol-lg-6 col-md-12 col-12  d-flex flex-column justify-content-center align-items-start ">
                            <h1 className="common-heading text-capitalize fw-bolder text-white">
                                Your Safety Our priority
                            </h1>
                            <p className="mt-3 mb-5 para-width text-white" style={{ textAlign: 'justify' }}>
                                We at Rakshika Sphere ensure that each and every person is secure and
                                get help if required as soon as possible with help of locatiion
                                sharing feature and Emergency Service available 24/7
                            </p>
                            <Link to='/contact' className="btn learn-more-btn">Contact Us</Link>
                        </div>
                    </div>
                </section>
            </section>
        </div>
    )
}

export default Parallelx
