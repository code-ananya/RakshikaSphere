const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer');
require('dotenv').config();
const { gmailContent,successFullVerification,mapLocation,mapLocationNearby } = require('./emailTemplate')
const secret_key = process.env.ACCESS_TOKEN_SECRET;



const generateverificationToken = (email) => {
    return jwt.sign({ email: email }, secret_key, { expiresIn: '1d' })
}


const getMailAuth = () => {
    const user = process.env.EMAIL || process.env.EMAIL_USER || 'rakshikasphere.app@gmail.com';
    const pass = process.env.PASSWORD || process.env.EMAIL_PASS || '';
    return { user, pass };
};

const sendVerificationEmail = async (recipientEmail, verificationToken) => {
    try {
        const { user, pass } = getMailAuth();
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user,
                pass,
            }

        })

        const emailcontent = gmailContent(verificationToken);

        await transporter.sendMail({
            from: process.env.EMAIL,
            to: recipientEmail,
            subject: 'Email Verification',
            html: emailcontent
        })

        console.log("Verification email has been sent");

    } catch (error) {
        console.error('Error sending verification email:', error);
    }
}



const sendHelpEmail = async(recipientEmail,lat,long,username,pincode,formatted_address) => {
    try {
        const { user, pass } = getMailAuth();
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user,
                pass,
            }

        })

        const emailcontent = mapLocation(lat,long,username,pincode,formatted_address);

        await transporter.sendMail({
            from: process.env.EMAIL,
            to: recipientEmail,
            subject: `${username} NEEDS HELP!!!`,
            html: emailcontent
        })

        console.log("Verification email has been sent");

    } catch (error) {
        console.error('Error sending verification email:', error);
    }
}

const sendHelpEmailContacts = async(recipientEmail,lat,long,username,pincode,formatted_address) => {
    try {
        const { user, pass } = getMailAuth();
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user,
                pass,
            }

        })

        const emailcontent = mapLocationNearby(lat,long,username,pincode,formatted_address);

        await transporter.sendMail({
            from: process.env.EMAIL,
            to: recipientEmail,
            subject: `${username} NEEDS HELP!!!`,
            html: emailcontent
        })

        console.log("Verification email has been sent");

    } catch (error) {
        console.error('Error sending verification email:', error);
    }
}


module.exports = {
    generateverificationToken,
    sendVerificationEmail,
    sendHelpEmailContacts,
    sendHelpEmail
}