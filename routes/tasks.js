const express = require("express");
const router = express.Router();
const Task = require("../models/Task");

// إدخال بيانات المهام
router.post("/submit", async (req, res) => {
  try {
    const { username, selectedTasks, waterAmount, bottlesAmount, points } = req.body;

    if (!username) {
      return res.status(400).json({ message: "اسم المستخدم مطلوب" });
    }

    const task = new Task({
      username,
      selectedTasks,
      waterAmount,
      bottlesAmount,
      points,
      timestamp: new Date()
    });

    await task.save();
    return res.status(200).json({ message: "تم حفظ المهام بنجاح", points: points });
  } catch (error) {
    console.error("❌ خطأ في حفظ المهام:", error);
    return res.status(500).json({ message: "فشل في حفظ المهام", error: error.message });
  }
});

// عرض جميع المهام
router.get("/all", async (req, res) => {
  try {
    const tasks = await Task.find();

    // تجميع المهام حسب اسم المستخدم
    const grouped = {};
    tasks.forEach((task) => {
      const username = task.username.toLowerCase();
      if (!grouped[username]) {
        grouped[username] = {
          tasks: [],
          waterAmount: 0,
          bottlesAmount: 0,
          points: 0,
          timestamp: null,
        };
      }

      grouped[username].tasks.push(task);
      grouped[username].waterAmount += parseInt(task.waterAmount || 0);
      grouped[username].bottlesAmount += parseInt(task.bottlesAmount || 0);
      grouped[username].points += task.points || 0;
      grouped[username].timestamp = task.timestamp;
    });

    res.json(grouped);
  } catch (error) {
    console.error("❌ خطأ في جلب المهام:", error);
    res.status(500).json({ message: "فشل في جلب المهام", error: error.message });
  }
});

module.exports = router;
