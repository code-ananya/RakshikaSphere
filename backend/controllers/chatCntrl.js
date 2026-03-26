const asyncHandler = require('express-async-handler');
const { User } = require('../models/userModel');
const { Chat } = require('../models/chatVictimModel');
const { Emergency } = require('../models/emergencyModel');


// ADD CHAT
const addChats = asyncHandler(async (req, res) => {

    const { senderId, receiverId, text, emergId } = req.body;

    // Validate input
    if (!senderId || !receiverId || !text || !emergId) {
        return res.status(400).json({
            message: "All fields are required"
        });
    }

    const sender = await User.findById(senderId);

    if (!sender) {
        return res.status(404).json({
            message: "Sender not found"
        });
    }

    const receiver = await User.findById(receiverId);

    if (!receiver) {
        return res.status(404).json({
            message: "Receiver not found"
        });
    }

    const emerg = await Emergency.findById(emergId);

    if (!emerg) {
        return res.status(404).json({
            message: "Emergency not found"
        });
    }

    const newChat = await Chat.create({
        sender: senderId,
        receiver: receiverId,
        textChat: text,
        emergency: emergId
    });

    return res.status(201).json({
        message: "Message sent successfully",
        chat: newChat
    });

});


// GET CHATS
const getChats = asyncHandler(async (req, res) => {

    const receiver = req.params.id;
    const emerg = req.params.emerg;

    if (!receiver || !emerg) {
        return res.status(400).json({
            message: "Receiver and emergency ID required"
        });
    }

    const chats = await Chat.find({
        receiver: receiver,
        emergency: emerg
    }).sort({ createdAt: 1 });

    if (!chats || chats.length === 0) {
        return res.status(200).json([]);
    }

    return res.status(200).json(chats);

});

module.exports = {
    addChats,
    getChats
};