import dotenv from "dotenv";
dotenv.config();
import _ from "lodash";
import userQuery from "../utils/helper/dbHelper.js";

const addEducationResource = async (req, res) => {
    const { title, description, read_time, icon, category, level } = req.body;
    const user = req.user;

    // Allowed levels
    const validLevels = ['Beginner', 'Medium', 'Expert'];

    // Check admin privileges
    if (!user || user.userType !== "admin") {
        return res.status(403).json({
            error: "Forbidden",
            message: "You are not authorized to perform this action",
            statusCode: 403,
            status: "error"
        });
    }

    // Validate level
    if (!validLevels.includes(level)) {
        return res.status(400).json({
            error: "Bad Request",
            message: `'${level}' is not a valid level. Allowed values: ${validLevels.join(', ')}`,
            statusCode: 400,
            status: "error"
        });
    }

    // Validate required fields
    const errors = [];
    if (!title || typeof title !== "string") errors.push("title (string) is required");
    if (!description || typeof description !== "string") errors.push("description (string) is required");
    if (!read_time || typeof read_time !== "string") errors.push("read_time (string) is required");
    if (!icon || typeof icon !== "string") errors.push("icon (string) is required");
    if (!category || typeof category !== "string") errors.push("category (string) is required");
    if (!level || typeof level !== "string") errors.push("level (string) is required");

    if (errors.length > 0) {
        return res.status(400).json({
            error: "Validation Error",
            message: "Missing or invalid fields",
            details: errors,
            statusCode: 400,
            status: "error"
        });
    }

    try {
        // Check for duplicate title
        const [existing] = await userQuery(
            "SELECT 1 FROM education WHERE title = ? LIMIT 1",
            [title]
        );

        if (existing) {
            return res.status(409).json({
                error: "Conflict",
                message: "An education resource with the same title already exists",
                statusCode: 409,
                status: "error"
            });
        }

        // Insert new education resource
        await userQuery(
            `INSERT INTO education (title, description, read_time, icon, category, level)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [title, description, read_time, icon, category, level]
        );

        return res.status(201).json({
            message: "Education resource added successfully",
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

const getEducationResources = async (req, res) => {
    const { level, category, readStatus = 'all', limit = 10, offset = 0 } = req.query;
    const user = req.user;

    const validLevels = ['All', 'Beginner', 'Medium', 'Expert'];
    const validReadStatuses = ['all', 'read', 'unread'];

    // Validate query params
    if (!level || typeof level !== 'string' || !category || typeof category !== 'string') {
        return res.status(400).json({
            error: "Bad Request",
            message: "Both 'level' and 'category' query parameters are required and must be strings.",
            statusCode: 400,
            status: "error"
        });
    }

    if (!validLevels.includes(level.trim())) {
        return res.status(400).json({
            error: "Bad Request",
            message: `'${level}' is not a valid level. Allowed values: ${validLevels.join(', ')}`,
            statusCode: 400,
            status: "error"
        });
    }

    if (!validReadStatuses.includes(readStatus)) {
        return res.status(400).json({
            error: "Bad Request",
            message: `'${readStatus}' is not a valid readStatus. Allowed values: ${validReadStatuses.join(', ')}`,
            statusCode: 400,
            status: "error"
        });
    }

    try {
        const values = [];
        let query = `SELECT * FROM education WHERE 1=1`;

        // Apply level filter
        if (level !== 'All') {
            query += ` AND level = ?`;
            values.push(level.trim());
        }

        // Apply category filter
        if (category !== 'All') {
            query += ` AND category = ?`;
            values.push(category.trim());
        }

        // Pagination
        query += ` LIMIT ? OFFSET ?`;
        values.push(Number(limit), Number(offset));

        // Fetch filtered resources
        const resources = await userQuery(query, values);

        if (!resources.length) {
            return res.status(404).json({
                error: "Not Found",
                message: "No education resources found for the given filters.",
                statusCode: 404,
                status: "error"
            });
        }

        // Get user track for read/unread filtering
        const resourceIds = resources.map(r => r.id);
        const placeholders = resourceIds.map(() => '?').join(',');

        let readResourceIds = new Set();

        if (resourceIds.length) {
            const userTrackQuery = `
                SELECT education_id 
                FROM education_user_track 
                WHERE user_id = ? 
                AND education_id IN (${placeholders})
            `;
            const trackRows = await userQuery(userTrackQuery, [user.userId, ...resourceIds]);
            readResourceIds = new Set(trackRows.map(row => row.education_id));
        }

        // Add read status & apply final filtering
        const filteredResources = resources
            .map(resource => ({
                ...resource,
                userHasRead: readResourceIds.has(resource.id)
            }))
            .filter(resource => {
                if (readStatus === 'read') return resource.userHasRead;
                if (readStatus === 'unread') return !resource.userHasRead;
                return true; // 'all'
            });

        return res.status(200).json({
            message: "Education resources retrieved successfully",
            data: filteredResources,
            pagination: {
                limit: Number(limit),
                offset: Number(offset),
                count: filteredResources.length
            },
            statusCode: 200,
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

const updateEducationResources = async (req, res) => {
    const { id } = req.params;
    const { title, description, read_time, icon, category, level } = req.body;
    const user = req.user;

    const validLevels = ['All Levels', 'Beginner', 'Medium', 'Expert'];

    // ✅ Check admin
    if (!user || user.userType !== "admin") {
        return res.status(403).json({
            error: "Forbidden",
            message: "You are not authorized to perform this action",
            statusCode: 403,
            status: "error"
        });
    }

    // ✅ Validate field types
    const errors = [];

    if (title !== undefined && typeof title !== "string") errors.push("title must be a string");
    if (description !== undefined && typeof description !== "string") errors.push("description must be a string");
    if (read_time !== undefined && typeof read_time !== "string") errors.push("read_time must be a string");
    if (icon !== undefined && typeof icon !== "string") errors.push("icon must be a string");
    if (category !== undefined && typeof category !== "string") errors.push("category must be a string");
    if (level !== undefined) {
        if (typeof level !== "string") errors.push("level must be a string");
        else if (!validLevels.includes(level)) errors.push(`Invalid level. Allowed: ${validLevels.join(", ")}`);
    }

    if (errors.length > 0) {
        return res.status(400).json({
            error: "Validation Error",
            message: "Invalid input data",
            details: errors,
            statusCode: 400,
            status: "error"
        });
    }

    try {
        // ✅ Check if record exists
        const [existingResource] = await userQuery("SELECT * FROM education WHERE id = ? LIMIT 1", [id]);

        if (!existingResource) {
            return res.status(404).json({
                error: "Not Found",
                message: `Education resource with ID ${id} does not exist`,
                statusCode: 404,
                status: "error"
            });
        }

        // ✅ Collect update fields
        const fieldsToUpdate = {};
        if (title !== undefined) fieldsToUpdate.title = title;
        if (description !== undefined) fieldsToUpdate.description = description;
        if (read_time !== undefined) fieldsToUpdate.read_time = read_time;
        if (icon !== undefined) fieldsToUpdate.icon = icon;
        if (category !== undefined) fieldsToUpdate.category = category;
        if (level !== undefined) fieldsToUpdate.level = level;

        // ✅ Require at least one field
        if (Object.keys(fieldsToUpdate).length === 0) {
            return res.status(400).json({
                error: "Bad Request",
                message: "At least one field must be provided to update",
                statusCode: 400,
                status: "error"
            });
        }

        // ✅ Build query
        const setClause = Object.keys(fieldsToUpdate).map(key => `${key} = ?`).join(", ");
        const values = [...Object.values(fieldsToUpdate), id];
        const query = `UPDATE education SET ${setClause} WHERE id = ?`;

        const result = await userQuery(query, values);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: "Not Found",
                message: "Education resource not found",
                statusCode: 404,
                status: "error"
            });
        }

        return res.status(200).json({
            message: "Education resource updated successfully",
            statusCode: 200,
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

const deleteEducationResources = async (req, res) => {
    const { id } = req.params;
    const user = req.user;

    // Check if user is admin
    if (!user || user.userType !== "admin") {
        return res.status(403).json({
            error: "Forbidden",
            message: "You are not authorized to perform this action",
            statusCode: 403,
            status: "error"
        });
    }

    try {
        // Check if resource exists
        const [existingResource] = await userQuery("SELECT * FROM education WHERE id = ? LIMIT 1", [id]);

        if (!existingResource) {
            return res.status(404).json({
                error: "Not Found",
                message: `Education resource with ID ${id} does not exist`,
                statusCode: 404,
                status: "error"
            });
        }

        // Delete resource
        await userQuery("DELETE FROM education WHERE id = ?", [id]);
        // delete related content
        await userQuery("DELETE FROM education_content WHERE education_id = ?", [id]);
        
        return res.status(200).json({
            message: "Education resource deleted successfully",
            statusCode: 200,
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
}


export default {
    addEducationResource,
    getEducationResources,
    updateEducationResources,
    deleteEducationResources
    // Additional methods can be added here in the future
}