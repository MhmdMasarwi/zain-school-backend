const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  username: { type: String, required: true },
  selectedTasks: [String],
  waterAmount: String,
  bottlesAmount: String,
  points: Number,
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Task", taskSchema);
