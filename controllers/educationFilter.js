import dotenv from "dotenv";
dotenv.config();
import _ from "lodash";
import userQuery from "../utils/helper/dbHelper.js";

const getEducationFilter = async (req, res) => {
    try {
        // Static levels
        const allLevels = ['All', 'Beginner', 'Medium', 'Expert'];

        const validReadStatuses = ['all', 'read', 'unread'];

        // Fetch distinct categories from education table
        const educationCategories = await userQuery(`SELECT DISTINCT category FROM education`);

        // Extract category values
        const allCategories = educationCategories.map(row => row.category).filter(Boolean);

        return res.status(200).json({
            status: "success",
            message: "Education filter data fetched successfully",
            data: {
                categories: ["All", ...allCategories],
                levels: allLevels,
                readStatuses: validReadStatuses
            }
        });
    } catch (error) {
        console.error("DB Error:", error);
        return res.status(500).json({
            status: "error",
            error: "Internal Server Error",
            message: error.message,
            statusCode: 500
        });
    }
};

export default {
    getEducationFilter
};