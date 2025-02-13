const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];
  if (!token) return res.status(403).json({ message: "גישה נדחתה. חסר טוקן." });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "טוקן לא תקף." });
    req.user = user;
    next();
  });
};

module.exports = authenticateToken;
