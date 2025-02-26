const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    fatherName: { type: String, required: true },
    username: { type: String, required: true, unique: true, match: /^[A-Za-z]+$/ },
    password: { type: String, required: true },
    gradeLevel: { type: String, required: true },
    className: { type: String, required: true }
});

module.exports = mongoose.model("User", UserSchema);
