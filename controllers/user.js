import dotenv from "dotenv";
dotenv.config();
import _ from "lodash";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import userQuery from "../utils/helper/dbHelper.js";
import nodemailer from "nodemailer";
import crypto from "crypto";

const signup = async (req, res) => {
  const userData = req.body;

  if (_.isEmpty(userData)) {
    return res.status(400).json({ message: "No data received" });
  }

  const {
    first_name,
    last_name,
    email,
    password,
    hear_about_us,
    user_type,
  } = userData;

  const validUserTypes = ["admin", "visitor"];
  if (!validUserTypes.includes(user_type)) {
    return res.status(400).json({ message: "Invalid user type", status: "error", statusCode: 400 });
  }

  try {
    // Check if user already exists by email
    const existingUser = await userQuery(`SELECT * FROM users WHERE email = ?`, [email]);
    if (existingUser.length > 0) {
      return res.status(400).json({ message: "Email already exists", status: "error", statusCode: 400 });
    }

    // Generate OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpTimestamp = new Date().toISOString().slice(0, 19).replace("T", " ");

    const hashedPassword = await bcrypt.hash(password, 10);

    // Save user in DB (simplified fields)
    await userQuery(
      `
      INSERT INTO users 
        (first_name, last_name, email, password, hear_about_us, user_type, status, otp, otpTimestamp)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
      `,
      [
        first_name,
        last_name,
        email,
        hashedPassword,
        hear_about_us,
        user_type,
        otp,
        otpTimestamp,
      ]
    );

    // Send OTP email
    const mailOptions = {
      from: "Sparki Connect",
      to: email,
      subject: "Sparki Connect OTP",
      html: getHtmlContent(otp, first_name, last_name, 'Signup'),
    };
    
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error("Error sending OTP email:", err);
        return res.status(500).json({ message: "Error sending OTP email", status: "error", statusCode: 400 });
      }
      res.status(200).json({ message: "OTP sent to your email", status: "success", statusCode: 200 });
    });

  } catch (err) {
    console.error("Error during signup OTP:", err);
    res.status(500).json({ message: "Error while processing signup", status: "error", statusCode: 500 });
  }
};


const verifyOtpAndCompleteSignup = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required", status: "error", statusCode: 400 });
  }

  try {
    // Check if the OTP is valid in the database
    const userResults = await userQuery(`SELECT * FROM users WHERE email = ?`, [email]);
    if (userResults.length === 0) {
      return res.status(404).json({ message: "User not found", status: "error", statusCode: 400 });
    }

    const user = userResults[0];
    if (user.status === "active") {
      return res.status(400).json({ message: "User is already verified", status: "success", statusCode: 200 });
    }

    if (user.otp != otp) {
      return res.status(400).json({ message: "Invalid OTP", status: "error", statusCode: 400 });
    }

    // Check if the OTP is expired
    const otpTimestamp = new Date(user.otpTimestamp).getTime();
    const currentTime = new Date().toISOString().slice(0, 19).replace("T", " ");

    if (currentTime - otpTimestamp > 5 * 60 * 1000) { // 5 minutes
      return res.status(400).json({ message: "OTP expired", status: "error", statusCode: 400 });
    }

    // Update user status to active
    await userQuery(
      `UPDATE users SET status = 'active' WHERE email = ?`,
      [email]
    );

    // Generate a JWT token
    const userRecord = await userQuery(`SELECT * FROM users WHERE email = ?`, [email]);
    const token = jwt.sign(
      { userId: userRecord[0].id, userType: userRecord[0].user_type },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Set the JWT token as a cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 3600000, // 1 hour expiration for the cookie
    });

    res.status(200).json({
      message: "User successfully verified and registered",
      user: { id: user.id, email: user.email, token: token, fullName: `${user.first_name} ${user.last_name}`, hear_about_us: user.hear_about_us, trade_level: user.trade_level, about_us: user.about_us, profile_picture: user.profile_picture, account: user.status, location: { latitude: user.latitude, longitude: user.longitude, location: user.location }, userType: user.user_type },
      token: token,
      status: "success",
      statusCode: 200
    });

  } catch (err) {
    console.error("Error during OTP verification and registration:", err);
    res.status(500).json({ message: "Error while verifying OTP and completing signup", status: "error", statusCode: 500 });
  }
};

const login = async (req, res) => {
  const { email, password, token } = req.body;

  if (token) {
    try {
      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Fetch user details from the database using the decoded userId
      const userResults = await userQuery(
        `SELECT * FROM users WHERE id = ?`,
        [decoded.userId]
      );

      const user = userResults[0];
      if (!user) {
        return res.status(404).json({ message: "Invalid token", status: "error", statusCode: 400 });
      }

      // Check if the user account is active
      if (user.status !== "active") {
        return res.status(403).json({ message: "Account is not active", status: "error", statusCode: 400 });
      }

      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 3600000, // 1 hour expiration for the cookie
      });

      return res.status(200).json({
        message: "Login successful",
        user: { id: user.id, email: user.email, token: token, fullName: `${user.first_name} ${user.last_name}`, hear_about_us: user.hear_about_us, trade_level: user.trade_level, about_us: user.about_us, profile_picture: user.profile_picture, account: user.status, location: { latitude: user.latitude, longitude: user.longitude, location: user.location } },
        status: "success", statusCode: 200
      });
    } catch (err) {
      console.error("Error during token-based login:", err);
      return res.status(401).json({ message: "Invalid or expired token", status: "error", statusCode: 400 });
    }
  } else {
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and Password are required", status: "error", statusCode: 400 });
    }

  try {
    // Check if the user with the provided email exists
    const userResults = await userQuery(
      `SELECT * FROM users WHERE email = ?`,
      [email]
    );

    const user = userResults[0];
    if (!user) {
      return res.status(404).json({ message: "Invalid credentials", status: "error", statusCode: 400 });
    }

    // Compare the provided password with the stored hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid password", status: "error", statusCode: 400 });
    }

    // Check if user account is active
    if (user.status !== "active") {
      // Generate OTP
      const otp = crypto.randomInt(100000, 999999).toString();

      // Save the OTP and timestamp in the database
      const otpTimestamp = new Date().toISOString().slice(0, 19).replace("T", " ");

      // replace the OTP and timestamp in the database

      const updateOtpQuery = `UPDATE users SET otp = ?, otpTimestamp = ? WHERE id = ?`;
      await userQuery(updateOtpQuery, [otp, otpTimestamp, user.id]);

      // Send OTP via email
      const mailOptions = {
        from: "Sparki Connect",
        to: user.email,
        subject: "Sparki Connect OTP",
        html: getHtmlContent(otp,user.first_name,user.last_name, 'Login'),
      };

      await transporter.sendMail(mailOptions);
      return res.status(200).json({ message: "OTP sent to your email" });
    }

    const token = jwt.sign(
      { userId: userResults[0].id, userType: userResults[0].user_type },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Generate a JWT token
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 3600000, // 1 hour expiration for the cookie
    });

    // Set the JWT token as a session cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 3600000, // 1 hour expiration for the cookie
    });
    console.log("User logged in successfully:", user.id, user.email);
    
    res.status(200).json({
      message: "Login successful",
      user: { id: user.id, email: user.email, token: token, fullName: `${user.first_name} ${user.last_name}`, hear_about_us: user.hear_about_us, trade_level: user.trade_level, about_us: user.about_us, profile_picture: user.profile_picture, account: user.status, location: { latitude: user.latitude, longitude: user.longitude, location: user.location }, userType: user.user_type },  
      status: "success",
      statusCode: 200
    });
  } catch (err) {
    console.error("Error during login:", err);
    res.status(500).json({ message: "Internal server error", status: "error", statusCode: 500 });
  }
}
};

function getHtmlContent(otp,first_name,last_name, otp_type) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0;
          background-color: #f4f4f9;
        }
        .email-container {
          max-width: 600px;
          margin: 20px auto;
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        .header {
          background-color: #4CAF50;
          color: #ffffff;
          text-align: center;
          padding: 20px;
          font-size: 24px;
          font-weight: bold;
        }
        .content {
          padding: 20px;
          color: #333333;
          line-height: 1.6;
          text-align: center;
        }
        .otp {
          font-size: 28px;
          font-weight: bold;
          color: #4CAF50;
          margin: 20px 0;
        }
        .footer {
          background-color: #f4f4f9;
          color: #777777;
          font-size: 12px;
          text-align: center;
          padding: 15px;
        }
        .footer a {
          color: #4CAF50;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">Your OTP Code</div>
        <div class="content">
          <p>Hello, ${first_name} ${last_name}!</p>
          <p>Your one-time password (OTP) for ${otp_type} is:</p>
          <div class="otp">${otp}</div>
          <p>This OTP is valid for the next <strong>5 minutes</strong>. Please do not share it with anyone.</p>
        </div>
        <div class="footer">
          If you didn't request this OTP, please ignore this email or contact our support team.  
          <br><br>
          <a href="#">Visit Our Support Center</a>
        </div>
      </div>
    </body>
    </html>
  `;
}

const resentOTP = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required", status: "error", statusCode: 400 });
  }

  try {
    // Check if the user with the provided email exists
    const userResults = await userQuery(
      `SELECT * FROM users WHERE email = ?`,
      [email]
    );

    const user = userResults[0];
    if (!user) {
      return res.status(404).json({ message: "Invalid email", status: "error", statusCode: 400 });
    }

    // Check if user account is active
    if (user.status !== "active") {
      let otp;

      // Check if user already has an OTP
      if (user.otp) {
        const otpTimestamp = new Date(user.otpTimestamp).getTime();
        const currentTime = new Date().toISOString().slice(0, 19).replace("T", " ");
        const otpExpirationTime = 5 * 60 * 1000; // 5 minutes
        
        if (currentTime - otpTimestamp > otpExpirationTime) {
          // OTP expired, generate a new one
          otp = crypto.randomInt(100000, 999999).toString();
        } else {
          // Use the existing OTP
          otp = user.otp;
        }
      } else {
        // Generate a new OTP if none exists
        console.log("No existing OTP, generating a new one");
        otp = crypto.randomInt(100000, 999999).toString();
      }

      // Save the OTP and timestamp in the database
      const otpTimestamp = new Date().toISOString().slice(0, 19).replace("T", " ");

      const updateOtpQuery = `UPDATE users SET otp = ?, otpTimestamp = ? WHERE id = ?`;
      await userQuery(updateOtpQuery, [otp, otpTimestamp, user.id]);

      // Send OTP via email
      const mailOptions = {
        from: "Sparki Connect",
        to: user.email,
        subject: "Sparki Connect OTP",
        html: getHtmlContent(otp, user.first_name, user.last_name, 'Login'),
      };

      await transporter.sendMail(mailOptions);

      return res.status(200).json({ message: "OTP sent to your email", status: "success", statusCode: 200 });
    }

    return res.status(200).json({ message: "User is already verified", status: "success", statusCode: 200 });
  } catch (err) {
    console.error("Error during OTP verification and registration:", err);
    res.status(500).json({ message: "Error while verifying OTP and completing signup", status: "error", statusCode: 500 });
  }
};

const getProfile = async (req, res) => {
  const { userId } = req.user;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required.", status: "error", statusCode: 400 });
  }

  try {
    const query = `
      SELECT 
        id, 
        first_name, 
        last_name, 
        email, 
        hear_about_us, 
        trade_level, 
        latitude, 
        longitude,
        location, 
        profile_picture, 
        status, 
        user_type, 
        about_us, 
        created_at, 
        updated_at 
      FROM users 
      WHERE id = ?
    `;

    const user = await userQuery(query, [userId]);

    if (user.length === 0) {
      return res.status(404).json({ message: "User not found.", status: "error", statusCode: 404 });
    }

    const { latitude, longitude, ...rest } = user[0];

    res.status(200).json({
      message: "User profile retrieved successfully",
      userId: user[0].id,
      profile: {
        ...rest,
        location: {
          latitude,
          longitude,
          location: user[0].location
        }
      },
      status: "success",
      statusCode: 200
    });

  } catch (err) {
    console.error("Error retrieving user profile:", err);
    res.status(500).json({
      message: "Error while fetching profile",
      details: err.message || err,
      status: "error",
      statusCode: 500
    });
  }
};


const updateProfile = async (req, res) => {
  const { userId } = req.user;
  const { first_name, last_name, trade_level, latitude, longitude, location, profile_picture, about_us } =
    req.body;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required.", status: "error", statusCode: 400 });
  }

  // Validate input: at least one field should be provided for update
  if (
    !first_name &&
    !last_name &&
    !trade_level &&
    !latitude &&
    !longitude &&
    !location &&
    !profile_picture &&
    !about_us
  ) {
    return res
      .status(400)
      .json({ message: "At least one field is required for update.", status: "error", statusCode: 400 });
  }

  try {
    // Dynamically build the query for the fields provided
    let fields = [];
    let params = [];

    if (first_name) {
      fields.push("first_name = ?");
      params.push(first_name);
    }
    if (last_name) {
      fields.push("last_name = ?");
      params.push(last_name);
    }
    if (trade_level) {
      fields.push("trade_level = ?");
      params.push(trade_level);
    }
    if (latitude) {
      fields.push("latitude = ?");
      params.push(latitude);
    }
    if (longitude) {
      fields.push("longitude = ?");
      params.push(longitude);
    }
    if (profile_picture) {
      fields.push("profile_picture = ?");
      params.push(profile_picture);
    }
    if (about_us) {
      fields.push("about_us = ?");
      params.push(about_us);
    }
    if (location) {
      fields.push("location = ?");
      params.push(location);
    }
    const setClause = fields.join(", ");
    params.push(userId); // Add userId as the last parameter for WHERE clause

    const query = `UPDATE users SET ${setClause}, updated_at = NOW() WHERE id = ?`;
    const result = await userQuery(query, params);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "User not found or no changes were made." , status: "error", statusCode: 404 });
    }

    res.json({ message: "Profile updated successfully.", status: "success", statusCode: 200 });
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Database error while updating profile",
        details: error,
        status: "error",
        statusCode: 500
      });
  }
};

const deleteAccount = async (req, res) => {
  const { userId } = req.user; // Assume `userId` is from JWT token
  const { confirmDeletion, password } = req.body; // Expect user confirmation and password

  if (!userId) {
    return res.status(400).json({ message: "User ID is required.", status: "error", statusCode: 400 });
  }

  // 1. Check if the user confirmed the deletion
  if (!confirmDeletion || confirmDeletion !== true) {
    return res
      .status(400)
      .json({ message: "Please confirm account deletion.", status: "error", statusCode: 400 });
  }

  try {
    // 2. Fetch the user data for further validations
    const userQueryText =
      "SELECT password, created_at, status FROM users WHERE id = ?";
    const userResult = await userQuery(userQueryText, [userId]);

    if (userResult.length === 0) {
      return res.status(404).json({ message: "User not found.", status: "error", statusCode: 404 });
    }

    const user = userResult[0];

    // 3. Check if the account status is active
    if (user.status !== "active") {
      return res
        .status(403)
        .json({ message: "Only active accounts can be deleted.", status: "error", statusCode: 403 });
    }

    // 4. Validate password (if required)
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Incorrect password.", status: "error", statusCode: 401 });
    }

    // 5. Check account age (e.g., 30 days minimum before allowing deletion)
    const accountAgeInDays =
      (new Date() - new Date(user.created_at)) / (1000 * 60 * 60 * 24);
    if (accountAgeInDays < 30) {
      return res
        .status(403)
        .json({
          message: "Account must be at least 30 days old to be deleted.",
          status: "error",
          statusCode: 403
        });
    }

    // 6. Proceed with account deletion
    const deleteQuery = "DELETE FROM users WHERE id = ?";
    await userQuery(deleteQuery, [userId]);

    res.status(200).json({ message: "Account deleted successfully.", status: "success", statusCode: 200 });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Database error while deleting account", details: err, status: "error", statusCode: 500 });
  }
};

// create nodemailer test account for testing
// async function createTestAccount() {
//   let testAccount = await nodemailer.createTestAccount();
//   console.log("Test account created:", testAccount);
// }
// createTestAccount();


const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, // true for port 465, false for other ports
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_EMAIL_PASS,
  },
});

// Forgot password API
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  // Check if the email exists in the database
  const user = await userQuery(`SELECT * FROM users WHERE email = ?`, [email]);
  if (user.length === 0) {
    return res
      .status(404)
      .json({ message: "User with this email does not exist" , status: "error", statusCode: 404 });
  }

  // Generate OTP
  const otp = crypto.randomInt(100000, 999999).toString();

  // Save the OTP  only in the user table
  
  const updateOtpQuery = `UPDATE users SET forget_password_otp = ? WHERE email = ?`;
  await userQuery(updateOtpQuery, [otp, email]);

  // Send email with reset link
  const mailOptions = {
    from: 'Sparki Connect',
    to: email,
    subject: "Password Reset",
    html: getHtmlContent(otp, user[0].first_name, user[0].last_name, 'Reset Password'),
  };

  await transporter.sendMail(mailOptions);
  return res.status(200).json({ message: "Password reset OTP sent to your email", status: "success", statusCode: 200 });
};

const resetPassword = async (req, res) => {
  const { email, newPassword, otp } = req.body;

  // Check if the email exists in the database
  const user = await userQuery(`SELECT * FROM users WHERE email = ?`, [email]);

  if (user.length === 0) {
    return res
      .status(404)
      .json({ message: "User with this email does not exist", status: "error", statusCode: 404 });
  }

  // Check if the OTP is valid

  if (user[0].forget_password_otp != otp) {
    return res.status(400).json({ message: "Invalid OTP", status: "error", statusCode: 400 });
  }

  // Update the password

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  const updatePasswordQuery = `UPDATE users SET password = ?, forget_password_otp = 1 WHERE email = ?`;
  await userQuery(updatePasswordQuery, [hashedPassword, email]);

  return res.status(200).json({ message: "Password reset successfully", status: "success", statusCode: 200 });
};

const googleAuthSignUp = async (req, res) => {

  if (!req.user) {
    return res.status(400).json({ message: "User authentication failed", status: "error", statusCode: 400 });
  }

  const email = req.user.emails[0].value;
  const profile_picture = req.user.photos[0].value;
  const first_name = req.user.name.givenName;
  const last_name = req.user.name.familyName;
  const username = first_name + last_name;
  const social_login_type = "Gmail";
  const user_type = "visitor";
  const status = "active";
  // Check if the user already exists
  let userRecord = await userQuery(`SELECT * FROM users WHERE email = ?`, [email]);
  if (userRecord.length > 0) {

    // Generate a JWT token
    const token = jwt.sign(
      { userId: userRecord[0].id, userType: userRecord[0].user_type, email: userRecord[0].email, username: userRecord[0].username },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Set the JWT token as a cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 3600000, // 1 hour expiration for the cookie
    });

    return res.redirect(`http://localhost:3000/dashboard?token=${token}`);
    // return res.status(200).json({
    //   message: "User Already Exists",
    //   user: { id: userRecord[0].id, email: userRecord[0].email, username: userRecord[0].username },
    //   token: token,
    // });
  }

  // Save the user details in the database
  userRecord = await userQuery(
    `
      INSERT INTO users 
        (first_name, last_name, email, username, social_login_type, profile_picture, user_type, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
      `,
    [
      first_name,
      last_name,
      email,
      username,
      social_login_type,
      profile_picture,
      user_type,
      status
    ]
  );
  userRecord = await userQuery(`SELECT * FROM users WHERE id = ?`, [userRecord.insertId]);

  // Generate a JWT token
  const token = jwt.sign(
    { userId: userRecord[0].id, userType: userRecord[0].user_type, email: userRecord[0].email, username: userRecord[0].username },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  // Set the JWT token as a cookie
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 3600000, // 1 hour expiration for the cookie
  });

  // return res.status(200).json({
  //   message: "User successfully verified and registered",
  //   user: { id: userRecord[0].id, email: userRecord[0].email, username: userRecord[0].username },
  //   token: token,
  // });

  return res.redirect(`http://localhost:3000/dashboard?token=${token}`);

};

export default {
  signup,
  login,
  getProfile,
  updateProfile,
  deleteAccount,
  forgotPassword,
  resetPassword,
  verifyOtpAndCompleteSignup,
  googleAuthSignUp,
  resentOTP
};

