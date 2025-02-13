const mongoose = require("mongoose");


const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: mongoose.Schema.Types.Mixed, required: true }
});

module.exports = mongoose.model("User", userSchema);