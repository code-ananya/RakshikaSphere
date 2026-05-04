const asyncHandler = require("express-async-handler");
const { User } = require("../models/userModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const {
  successFullVerification
} = require("../utils/emailTemplate");


/*
========================
GET USER INFO
========================
*/

const userInfo = asyncHandler(async (req, res) => {
  return res.status(200).json(req.user);
});


/*
========================
REGISTER USER
========================
*/

const registerUser = asyncHandler(async (req, res) => {

  const {
    uname,
    email,
    password,
    phone,
    emergencyNo,
    emergencyMail,
    pincode
  } = req.body;

  if (!uname || !email || !password) {
    return res.status(400).json({
      message: "All fields are mandatory"
    });
  }

  const userAvailable = await User.findOne({ email });

  if (userAvailable) {
    return res.status(400).json({
      message: "Email already exists"
    });
  }

  let hashedPassword;

  try {
    hashedPassword = await bcrypt.hash(password, 10);
  } catch (err) {
    return res.status(500).json({
      message: "Password hashing failed"
    });
  }

  const user = await User.create({
    uname,
    email,
    password: hashedPassword,
    verificationToken: null,
    isVerified: true,
    phoneNo: phone,
    emergencyMail,
    emergencyNo,
    pinCode: pincode
  });

  if (!user) {
    return res.status(500).json({
      message: "Something went wrong"
    });
  }

  return res.status(201).json({
    message: "User registered successfully"
  });

});


/*
========================
VERIFY EMAIL
========================
*/

const verifyemail = asyncHandler(async (req, res) => {

  const tokenId = req.params.tokenId;

  const user = await User.findOne({
    verificationToken: tokenId
  });

  if (!user) {
    return res.status(404).json({
      error: "Invalid verification token"
    });
  }

  user.isVerified = true;
  user.verificationToken = null;

  await user.save();

  const congratulationContent =
    successFullVerification();

  return res
    .status(200)
    .send(congratulationContent);

});


/*
========================
LOGIN USER
========================
*/

const loginUser = asyncHandler(async (req, res) => {

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: "All fields are mandatory"
    });
  }

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(404).json({
      message: `User with email ${email} does not exist`
    });
  }

  const isMatch =
    await bcrypt.compare(password, user.password);

  if (!isMatch) {
    return res.status(400).json({
      message: "Password is not valid"
    });
  }

  if (!process.env.ACCESS_TOKEN_SECRET) {
    return res.status(500).json({
      message: "JWT secret missing"
    });
  }

  expiresIn: "1y"

  return res.status(200).json({
    user,
    token: accessToken
  });

});


/*
========================
PROFILE UPDATE
========================
*/

const profileUpdate = asyncHandler(async (req, res) => {

  const {
    uid,
    uname,
    email,
    phoneNo,
    address,
    pincode,
    emergencyMail,
    emergencyNo,
    extraEmail1,
    extraEmail2,
    extraPhone1,
    extraPhone2
  } = req.body;

  if (!uid) {
    return res.status(400).json({
      message: "User ID required"
    });
  }

  const user = await User.findById(uid);

  if (!user) {
    return res.status(404).json({
      message: "User not found"
    });
  }

  const emailExists =
    await User.findOne({
      email,
      _id: { $ne: uid }
    });

  if (emailExists) {
    return res.status(400).json({
      message: "Email already in use"
    });
  }

  user.uname = uname;
  user.email = email;
  user.phoneNo = phoneNo;
  user.address = address;
  user.pinCode = pincode;
  user.emergencyMail = emergencyMail;
  user.emergencyNo = emergencyNo;
  user.extraEmail1 = extraEmail1;
  user.extraEmail2 = extraEmail2;
  user.extraPhone1 = extraPhone1;
  user.extraPhone2 = extraPhone2;

  await user.save();

  return res.status(200).json({
    message: "User updated successfully"
  });

});


/*
========================
EXPORTS
========================
*/

module.exports = {
  userInfo,
  registerUser,
  loginUser,
  verifyemail,
  profileUpdate
};