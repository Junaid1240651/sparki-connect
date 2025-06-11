import dotenv from "dotenv";
dotenv.config();
import _ from "lodash";
import userQuery from "../utils/helper/dbHelper.js";

const addEducationUserTrack = async (req, res) => {
    const { userId, education_id } = req.body;

    // Validate inputs
    if (!userId || !education_id) {
        return res.status(400).json({
            error: "Validation Error",
            message: "Both userId and education_id are required",
            statusCode: 400,
            status: "error"
        });
    }

    try {
        // Check if the user exists
        const [user] = await userQuery(`SELECT * FROM users WHERE id = ? LIMIT 1`, [userId]);
        if (!user) {
            return res.status(404).json({
                error: "Not Found",
                message: `User not found with ID ${userId}`,
                statusCode: 404,
                status: "error"
            });
        }

        // Check if the education content exists
        const [content] = await userQuery(`SELECT * FROM education WHERE id = ? LIMIT 1`, [education_id]);
        if (!content) {
            return res.status(404).json({
                error: "Not Found",
                message: `Education not found with ID ${education_id}`,
                statusCode: 404,
                status: "error"
            });
        }

        // Check if the user has already tracked this education

        const [existingTrack] = await userQuery(`SELECT * FROM education_user_track WHERE user_id = ? AND education_id = ? LIMIT 1`, [userId, education_id]);

        if (existingTrack) {
            return res.status(409).json({
                error: "Conflict",
                message: `User with ID ${userId} has already tracked education with ID ${education_id}`,
                statusCode: 409,
                status: "error"
            });
        }
        
        // Insert tracking record
        const insertQuery = `
            INSERT INTO education_user_track (user_id, education_id)
            VALUES (?, ?)
        `;
        await userQuery(insertQuery, [userId, education_id]);

        return res.status(201).json({
            message: "Education user track added successfully.",
            statusCode: 201,
            status: "success"
        });

    } catch (error) {
        console.error("DB Error:", error);
        return res.status(500).json({
            error: "Internal Server Error",
            message: error.message,
            statusCode: 500,
            status: "error"
        });
    }
};
export default {
    addEducationUserTrack
};