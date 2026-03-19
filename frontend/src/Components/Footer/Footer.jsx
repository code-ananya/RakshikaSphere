import React from "react";
import "../../styles/footer.css";
import { BsLinkedin, BsGithub } from "react-icons/bs";
import { useAuth } from "../../context/auth";
import logo from '../../images/rakshikasphere_logo.png'

const Footer = (props) => {
  const [auth, setAuth] = useAuth();
  return (
    <>
      {auth?.user?.role ? (
        <div>
          <section id="contact" className="footer_wrapper">
            <div className="container">
              <div className="row">
                <div className="col-lg-5 footer_logo mb-4 mb-lg-0">
                  <h2 style={{ color: "white", fontWeight: "bold" }}>RakshikaSphere</h2>
                  <p className="footer_text" style={{ textAlign: "justify" }}>
                    At RakshikaSphere, we are dedicated to making a secure website for women safety.
                  </p>
                </div>
                <div className="col-lg-4 px-lg-5 mb-4 mb-lg-0">
                  <h3 className="footer_title">Contact</h3>
                  <p className="footer_text">
                    <span>rakshikasphere@gmail.com</span>
                    <br />
                    <span>JSS Academy Of Technical Education, Noida, Uttar Pradesh, India</span>
                  </p>
                </div>
                <div className="col-lg-3 mb-4 mb-lg-0">
                  <h3 className="footer_title">Social Media</h3>
                  <p>
                    <a href="https://www.linkedin.com" className="footer_social_media_icon" style={{ color: "white" }}>
                      <BsLinkedin size={25} />
                    </a>
                    <a href="https://github.com/code-ananya/RakshikaSphere" className="footer_social_media_icon" style={{ color: "white" }}>
                      <BsGithub size={25} />
                    </a>
                  </p>
                </div>
                <div className="col-12 footer_credits text-center">
                  <span>2024 RakshikaSphere. All Rights Reserved.</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : (
        <div>
          <section id="contact" className="footer_wrapper">
            <div className="container">
              <div className="row">
                <div className="col-lg-5 footer_logo mb-4 mb-lg-0">
                  <h2 style={{ color: "white", fontWeight: "bold" }}>RakshikaSphere</h2>
                  <p className="footer_text" style={{ textAlign: "justify" }}>
                    At RakshikaSphere, we are dedicated to making a secure website for women safety.
                  </p>
                </div>
                <div className="col-lg-4 px-lg-5 mb-4 mb-lg-0">
                  <h3 className="footer_title">Contact</h3>
                  <p className="footer_text">
                    <span>rakshikasphere@gmail.com</span>
                    <br />
                    <span>JSS Academy Of Technical Education, Noida, Uttar Pradesh, India</span>
                  </p>
                </div>
                <div className="col-lg-3 mb-4 mb-lg-0">
                  <h3 className="footer_title">Social Media</h3>
                  <p>
                    <a href="https://www.linkedin.com" className="footer_social_media_icon" style={{ color: "white" }}>
                      <BsLinkedin size={25} />
                    </a>
                    <a href="https://github.com/code-ananya/RakshikaSphere" className="footer_social_media_icon" style={{ color: "white" }}>
                      <BsGithub size={25} />
                    </a>
                  </p>
                </div>
                <div className="col-12 footer_credits text-center">
                  <span>2024 RakshikaSphere. All Rights Reserved.</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
};

export default Footer;
