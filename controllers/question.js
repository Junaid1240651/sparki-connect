import dotenv from "dotenv";
dotenv.config();
import _ from "lodash";
import userQuery from "../utils/helper/dbHelper.js";

const addQuestion = async (req, res) => {
    const { title, details, tags } = req.body;
    const {userId} = req.user;

    // Basic validation
    const errors = [];
    if (!title || typeof title !== 'string') errors.push("Title is required and must be a string.");
    if (!details || typeof details !== 'string') errors.push("Details are required and must be a string.");
    if (!userId) errors.push("User authentication failed.");

    // Convert tags to array (if any)
    const tagArray = tags ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : [];

    if (tagArray.length > 5) {
        errors.push("You can add a maximum of 5 tags only.");
    }

    if (errors.length > 0) {
        return res.status(400).json({
            status: "error",
            error: "Validation Error",
            message: errors.join(" "),
            statusCode: 400
        });
    }

    try {
        // Check for duplicate question
        const [existingQuestion] = await userQuery(
            `SELECT 1 FROM questions WHERE title = ? AND user_id = ? LIMIT 1`,
            [title, userId]
        );

        if (existingQuestion) {
            return res.status(409).json({
                status: "error",
                error: "Conflict",
                message: `A question with the title "${title}" already exists for this user.`,
                statusCode: 409
            });
        }

        // Insert question
        const insertQuery = `
            INSERT INTO questions (title, details, user_id, tags, posted_at)
            VALUES (?, ?, ?, ?, NOW())
        `;
        const result = await userQuery(insertQuery, [
            title,
            details,
            userId,
            JSON.stringify(tagArray)
        ]);

        return res.status(201).json({
            status: "success",
            message: "Question added successfully",
            data: {
                questionId: result.insertId,
                title,
                details,
                tags: tagArray
            },
            statusCode: 201
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

const addQuestionViews = async (req, res) => {
    const { questionId } = req.query;

    if (!questionId) {
        return res.status(400).json({
            status: "error",
            error: "Validation Error",
            message: "Question ID is required.",
            statusCode: 400
        });
    }

    try {
        // check if question exists
        const [existingQuestion] = await userQuery(
            `SELECT 1 FROM questions WHERE id = ? LIMIT 1`,
            [questionId]
        );

        if (!existingQuestion) {
            return res.status(404).json({
                status: "error",
                error: "Not Found",
                message: `Question with ID ${questionId} does not exist.`,
                statusCode: 404
            });
        }

        // check if view already exists

        const [existingView] = await userQuery(
            `SELECT 1 FROM question_views WHERE question_id = ? AND user_id = ? LIMIT 1`,
            [questionId, req.user.userId]
        );

        if (existingView) {
            return res.status(409).json({
                status: "error",
                error: "Conflict",
                message: `You have already viewed this question.`,
                statusCode: 409
            });
        }

        // Insert view record

        const insertQuery = `
            INSERT INTO question_views (question_id, user_id)
            VALUES (?, ?)
        `;

        await userQuery(insertQuery, [questionId, req.user.userId]);
        return res.status(201).json({
            status: "success",
            message: "Question view recorded successfully.",
            statusCode: 201
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

const addQuestionLikes = async (req, res) => {
    const { questionId } = req.query;

    if (!questionId) {
        return res.status(400).json({
            status: "error",
            error: "Validation Error",
            message: "Question ID is required.",
            statusCode: 400
        });
    }

    try {
        // Check if question exists
        const [existingQuestion] = await userQuery(
            `SELECT 1 FROM questions WHERE id = ? LIMIT 1`,
            [questionId]
        );

        if (!existingQuestion) {
            return res.status(404).json({
                status: "error",
                error: "Not Found",
                message: `Question with ID ${questionId} does not exist.`,
                statusCode: 404
            });
        }

        // Check if like already exists
        const [existingLike] = await userQuery(
            `SELECT 1 FROM question_likes WHERE question_id = ? AND user_id = ? LIMIT 1`,
            [questionId, req.user.userId]
        );

        if (existingLike) {
            return res.status(409).json({
                status: "error",
                error: "Conflict",
                message: `You have already liked this question.`,
                statusCode: 409
            });
        }

        // Insert like record
        const insertQuery = `
            INSERT INTO question_likes (question_id, user_id)
            VALUES (?, ?)
        `;

        await userQuery(insertQuery, [questionId, req.user.userId]);
        return res.status(201).json({
            status: "success",
            message: "Question like recorded successfully.",
            statusCode: 201
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
}

const removeQuestionLikes = async (req, res) => {
    const { questionId } = req.query;

    if (!questionId) {
        return res.status(400).json({
            status: "error",
            error: "Validation Error",
            message: "Question ID is required.",
            statusCode: 400
        });
    }

    try {
        // Check if question exists
        const [existingQuestion] = await userQuery(
            `SELECT 1 FROM questions WHERE id = ? LIMIT 1`,
            [questionId]
        );

        if (!existingQuestion) {
            return res.status(404).json({
                status: "error",
                error: "Not Found",
                message: `Question with ID ${questionId} does not exist.`,
                statusCode: 404
            });
        }

        // Check if like exists
        const [existingLike] = await userQuery(
            `SELECT 1 FROM question_likes WHERE question_id = ? AND user_id = ? LIMIT 1`,
            [questionId, req.user.userId]
        );

        if (!existingLike) {
            return res.status(404).json({
                status: "error",
                error: "Not Found",
                message: `You have not liked this question.`,
                statusCode: 404
            });
        }

        // Delete like record
        const deleteQuery = `
            DELETE FROM question_likes 
            WHERE question_id = ? AND user_id = ?
        `;

        await userQuery(deleteQuery, [questionId, req.user.userId]);
        return res.status(200).json({
            status: "success",
            message: "Question like removed successfully.",
            statusCode: 200
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
}

const addQuestionComments = async (req, res) => {
    const { questionId, comment } = req.body;
    const { userId } = req.user;

    // Basic validation
    if (!questionId || !comment || typeof comment !== 'string') {
        return res.status(400).json({
            status: "error",
            error: "Validation Error",
            message: "Question ID and comment are required.",
            statusCode: 400
        });
    }

    try {
        // Check if question exists
        const [existingQuestion] = await userQuery(
            `SELECT 1 FROM questions WHERE id = ? LIMIT 1`,
            [questionId]
        );

        if (!existingQuestion) {
            return res.status(404).json({
                status: "error",
                error: "Not Found",
                message: `Question with ID ${questionId} does not exist.`,
                statusCode: 404
            });
        }

        // Insert comment
        const insertQuery = `
            INSERT INTO question_comments (question_id, user_id, comment, posted_at)
            VALUES (?, ?, ?, NOW())
        `;
        await userQuery(insertQuery, [questionId, userId, comment]);

        return res.status(201).json({
            status: "success",
            message: "Comment added successfully",
            statusCode: 201
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
}

const getCurrentUserPostedQuestions = async (req, res) => {
    const { userId } = req.user;

    try {
        // 1. Fetch user questions
        const questions = await userQuery(`
            SELECT id, title, details, tags, posted_at 
            FROM questions 
            WHERE user_id = ? 
            ORDER BY posted_at DESC
        `, [userId]);

        if (questions.length === 0) {
            return res.status(404).json({
                status: "error",
                error: "Not Found",
                message: "No questions found for the current user.",
                statusCode: 404
            });
        }

        const questionIds = questions.map(q => q.id);

        // 2. Parse tags
        questions.forEach(q => {
            q.tags = JSON.parse(q.tags || "[]");
        });

        // 3. Fetch user info
        const [user] = await userQuery(`
            SELECT first_name, last_name, profile_picture 
            FROM users 
            WHERE id = ?
        `, [userId]);

        // 4. Fetch likes, views, and comments counts grouped by question_id
        const [likes, views, comments] = await Promise.all([
            userQuery(`
                SELECT question_id, COUNT(*) AS likes_count 
                FROM question_likes 
                WHERE question_id IN (?) 
                GROUP BY question_id
            `, [questionIds]),

            userQuery(`
                SELECT question_id, COUNT(*) AS views_count 
                FROM question_views 
                WHERE question_id IN (?) 
                GROUP BY question_id
            `, [questionIds]),

            userQuery(`
                SELECT question_id, COUNT(*) AS comments_count 
                FROM question_comments 
                WHERE question_id IN (?) 
                GROUP BY question_id
            `, [questionIds]),
        ]);

        // 5. Map counts to each question
        const mapCounts = (items, key) =>
            Object.fromEntries(items.map(i => [i.question_id, i[key]]));

        const likesMap = mapCounts(likes, 'likes_count');
        const viewsMap = mapCounts(views, 'views_count');
        const commentsMap = mapCounts(comments, 'comments_count');

        questions.forEach(q => {
            q.likes_count = likesMap[q.id] || 0;
            q.views_count = viewsMap[q.id] || 0;
            q.comments_count = commentsMap[q.id] || 0;
        });

        return res.status(200).json({
            status: "success",
            message: "Current user's posted questions fetched successfully.",
            user: {
                fullName: `${user.first_name} ${user.last_name}`,
                profilePicture: user.profile_picture
            },
            data: { questions },
            statusCode: 200
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

const getAllQuestions = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    try {
        // 1. Get paginated questions with user info
        const questions = await userQuery(`
            SELECT 
                q.id, q.title, q.details, q.tags, q.posted_at,
                u.first_name, u.last_name, u.profile_picture
            FROM questions q
            JOIN users u ON q.user_id = u.id
            ORDER BY q.posted_at DESC
            LIMIT ? OFFSET ?
        `, [limit, offset]);

        if (questions.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "No questions found.",
                statusCode: 404
            });
        }

        const questionIds = questions.map(q => q.id);

        // 2. Fetch likes, views, comments counts
        const [likes, views, comments] = await Promise.all([
            userQuery(`
                SELECT question_id, COUNT(*) AS likes_count 
                FROM question_likes 
                WHERE question_id IN (?) 
                GROUP BY question_id
            `, [questionIds]),

            userQuery(`
                SELECT question_id, COUNT(*) AS views_count 
                FROM question_views 
                WHERE question_id IN (?) 
                GROUP BY question_id
            `, [questionIds]),

            userQuery(`
                SELECT question_id, COUNT(*) AS comments_count 
                FROM question_comments 
                WHERE question_id IN (?) 
                GROUP BY question_id
            `, [questionIds])
        ]);

        // 3. Helper to map counts by question_id
        const mapCounts = (items, key) =>
            Object.fromEntries(items.map(i => [i.question_id, i[key]]));

        const likesMap = mapCounts(likes, 'likes_count');
        const viewsMap = mapCounts(views, 'views_count');
        const commentsMap = mapCounts(comments, 'comments_count');

        // 4. Enrich questions
        const formattedQuestions = questions.map(q => ({
            id: q.id,
            title: q.title,
            details: q.details,
            posted_at: q.posted_at,
            tags: JSON.parse(q.tags || "[]"),
            user: {
                fullName: `${q.first_name} ${q.last_name}`,
                profilePicture: q.profile_picture
            },
            likes_count: likesMap[q.id] || 0,
            views_count: viewsMap[q.id] || 0,
            comments_count: commentsMap[q.id] || 0
        }));

        return res.status(200).json({
            status: "success",
            message: "Questions fetched successfully.",
            data: {
                page,
                limit,
                questions: formattedQuestions
            },
            statusCode: 200
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

const getQuestionComments = async (req, res) => {
    const { questionId } = req.query;

    if (!questionId) {
        return res.status(400).json({
            status: "error",
            error: "Validation Error",
            message: "Question ID is required.",
            statusCode: 400
        });
    }

    try {
        // Check if question exists
        const [existingQuestion] = await userQuery(
            `SELECT 1 FROM questions WHERE id = ? LIMIT 1`,
            [questionId]
        );

        if (!existingQuestion) {
            return res.status(404).json({
                status: "error",
                error: "Not Found",
                message: `Question with ID ${questionId} does not exist.`,
                statusCode: 404
            });
        }

        // Fetch comments
        const comments = await userQuery(`
            SELECT qc.id, qc.comment, qc.posted_at, u.first_name, u.last_name, u.profile_picture
            FROM question_comments qc
            JOIN users u ON qc.user_id = u.id
            WHERE qc.question_id = ?
            ORDER BY qc.posted_at DESC
        `, [questionId]);

        return res.status(200).json({
            status: "success",
            message: "Comments fetched successfully.",
            data: { comments },
            statusCode: 200
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
}

export default {
    addQuestion,
    addQuestionViews,
    addQuestionLikes,
    removeQuestionLikes,
    addQuestionComments,
    getCurrentUserPostedQuestions,
    getAllQuestions,
    getQuestionComments
};