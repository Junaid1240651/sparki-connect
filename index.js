import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import session from "express-session";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import bodyParser from "body-parser";
import { dbConnection } from "./db/connection.js";

// Route imports
import userRoutes from "./routes/user.js";
import wholesalerRoutes from "./routes/wholeseller.js"; 
import educationRoutes from "./routes/education.js"; // Assuming you have an education route

const app = express();
const port = process.env.PORT || 3000;
const con = dbConnection();

// Middleware
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.set("trust proxy", 1);
app.use(
  session({
    secret: process.env.SESSION_SECRET || "fallback-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 30 * 60 * 1000, // 30 minutes
    },
  })
);

// Routes
app.use("/api/user", userRoutes);
app.use("/api/wholesaler", wholesalerRoutes);
app.use("/api/education", educationRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "An unexpected error occurred", error: err.message });
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});