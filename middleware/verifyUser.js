import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import "dotenv/config";
dotenv.config();

// Middleware to verify JWT token
const verifyUser = (req, res, next) => {
  const token = req.cookies.token || req.headers["authorization"]; // Retrieve token from cookies

  if (!token) {
    return res
      .status(401)
      .json({ message: "Access denied. No token provided." });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach decoded user data to request object
    next(); // Proceed to the next middleware or route handler
  } catch (error) {
    res.status(403).json({ message: "Invalid token." });
  }
};

export default verifyUser;
