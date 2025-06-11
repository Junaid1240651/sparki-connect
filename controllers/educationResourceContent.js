import dotenv from "dotenv";
dotenv.config();
import _ from "lodash";
import userQuery from "../utils/helper/dbHelper.js";

const addEducationResourceContent = async (req, res) => {
    const { educationId, author, content } = req.body;
    const user = req.user;

    // Authorization check
    if (!user || user.userType !== "admin") {
        return res.status(403).json({
            error: "Forbidden",
            message: "You are not authorized to perform this action",
            statusCode: 403,
            status: "error"
        });
    }

    // Field validations
    const errors = [];

    if (!educationId || typeof educationId !== "number") {
        errors.push("educationId (number) is required");
    }

    if (!author || typeof author !== "string" || author.trim() === "") {
        errors.push("author (non-empty string) is required");
    }

    if (!content || typeof content !== "string" || content.trim() === "") {
        errors.push("content (non-empty string) is required");
    }

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
        // Check if education resource exists
        const existingResource = await userQuery("SELECT * FROM education WHERE id = ? LIMIT 1", [educationId]);

        if (existingResource.length === 0) {
            return res.status(404).json({
                error: "Not Found",
                message: `Education resource with id '${educationId}' does not exist`,
                statusCode: 404,
                status: "error"
            });
        }

        // Check if content already exists for this education resource

        const existingContent = await userQuery("SELECT * FROM education_content WHERE education_id = ? OR author = ?", [educationId, author.trim()]);
        if (existingContent.length > 0) {
            return res.status(409).json({
                error: "Conflict",
                message: `Content is already exists for education resource with id '${educationId}'`,
                statusCode: 409,
                status: "error"
            });
        }

        // Insert the content
        const insertQuery = `
            INSERT INTO education_content (education_id, author, content)
            VALUES (?, ?, ?)
        `;

        const result = await userQuery(insertQuery, [educationId, author.trim(), content.trim()]);

        if (result.affectedRows === 0) {
            return res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to add education content",
                statusCode: 500,
                status: "error"
            });
        }

        return res.status(201).json({
            message: "Education content added successfully",
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


const getEducationResourceContent = async (req, res) => {
    const { getEducationResourceId } = req.params;

    const user = req.user;

    // Validate query parameters
    if (getEducationResourceId && isNaN(Number(getEducationResourceId))) {
        return res.status(400).json({
            error: "Validation Error",
            message: "getEducationResourceId must be a number",
            statusCode: 400,
            status: "error"
        });
    }

    try {

        // If getEducationResourceId is provided, fetch that specific resource
        if (getEducationResourceId) {
            const [resource] = await userQuery("SELECT * FROM education WHERE id = ? LIMIT 1", [getEducationResourceId]);

            if (!resource) {
                return res.status(404).json({
                    error: "Not Found",
                    message: `Education resource with ID ${getEducationResourceId} does not exist`,
                    statusCode: 404,
                    status: "error"
                });
            }

            // Fetch related content for this resource
            const content = await userQuery("SELECT * FROM education_content WHERE education_id = ?", [getEducationResourceId]);

            if (content.length === 0) {
                return res.status(404).json({
                    error: "Not Found",
                    message: `No content found for education resource with ID ${getEducationResourceId}`,
                    statusCode: 404,
                    status: "error"
                });
            }

            //check if user has read the content

            const query = `SELECT * FROM education_user_track WHERE user_id = ? AND education_id = ?`;
            const userTrack = await userQuery(query, [user.userId, resource.id]);
            
            return res.status(200).json({
                data: {
                    ...resource,
                    content,
                    userHasRead: userTrack.length > 0
                },
                statusCode: 200,
                status: "success"
            });
        }


        return res.status(200).json({
            data: resourcesWithContent,
            statusCode: 200,
            status: "success"
        });
        
    } catch (error) {
        
    }

   
};

const updateEducationResourceContent = async (req, res) => {
    const { id } = req.params;
    const { author, content } = req.body;
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

    // Validate input
    if (!id || isNaN(Number(id))) {
        return res.status(400).json({
            error: "Validation Error",
            message: "ID must be a number",
            statusCode: 400,
            status: "error"
        });
    }

    if (!author || typeof author !== "string" || author.trim() === "") {
        return res.status(400).json({
            error: "Validation Error",
            message: "Author must be a non-empty string",
            statusCode: 400,
            status: "error"
        });
    }

    if (!content || typeof content !== "string" || content.trim() === "") {
        return res.status(400).json({
            error: "Validation Error",
            message: "Content must be a non-empty string",
            statusCode: 400,
            status: "error"
        });
    }

    try {
        // Check if resource exists
        const [existingResourceContent] = await userQuery("SELECT * FROM education_content WHERE id = ? LIMIT 1", [id]);

        if (!existingResourceContent) {
            return res.status(404).json({
                error: "Not Found",
                message: `Education content with ID ${id} does not exist`,
                statusCode: 404,
                status: "error"
            });
        }

        // Update resource content
        const updateQuery = `
            UPDATE education_content
            SET author = ?, content = ?
            WHERE id = ?
        `;

        const result = await userQuery(updateQuery, [author.trim(), content.trim(), id]);

        if (result.affectedRows === 0) {
            return res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to update education content",
                statusCode: 500,
                status: "error"
            });
        }
        return res.status(200).json({
            message: "Education content updated successfully",
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

const deleteEducationResourcesContent = async (req, res) => {
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
        // Validate ID
        if (!id || isNaN(Number(id))) {
            return res.status(400).json({
                error: "Validation Error",
                message: "ID must be a number",
                statusCode: 400,
                status: "error"
            });
        }

        // Check if content exists
        const [existingContent] = await userQuery("SELECT * FROM education_content WHERE id = ? LIMIT 1", [id]);

        if (!existingContent) {
            return res.status(404).json({
                error: "Not Found",
                message: `Education content with ID ${id} does not exist`,
                statusCode: 404,
                status: "error"
            });
        }

        // Delete content
        const deleteQuery = "DELETE FROM education_content WHERE id = ?";
        const result = await userQuery(deleteQuery, [id]);

        if (result.affectedRows === 0) {
            return res.status(500).json({
                error: "Internal Server Error",
                message: "Failed to delete education content",
                statusCode: 500,
                status: "error"
            });
        }

        return res.status(200).json({
            message: "Education content deleted successfully",
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
    addEducationResourceContent,
    getEducationResourceContent,
    updateEducationResourceContent,
    deleteEducationResourcesContent
    // Additional methods can be added here in the future
}