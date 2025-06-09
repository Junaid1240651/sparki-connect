import dotenv from "dotenv";
dotenv.config();
import _ from "lodash";
import userQuery from "../utils/helper/dbHelper.js";
import { getDistance } from 'geolib'; 

const addWholesaler = async (req, res) => {
    const {
        store_name,
        current_status,
        open_time,
        close_time,
        distance,
        duration,
        email,
        location,
        longitude,
        latitude
    } = req.body;

    const user = req.user;
    
    // Check if the userType is admin

    if (!user || user.userType !== "admin") {
        return res.status(403).json({
            error: "Forbidden",
            message: "You are not authorized to perform this action",
            statusCode: 403,
            status: "error"
        });
    }

    // Basic validation
    if (!store_name || !current_status || !open_time || !close_time || !distance || !duration || !email || !latitude || !longitude) {
        return res.status(400).json({
            error: "Missing required fields",
            statusCode: 400,
            status: "error",
        });
    }
    
    // Check if the store_name and location and latitude and longitude are already in the database

    const existingWholesaler = await userQuery(
        "SELECT * FROM wholesalers WHERE store_name = ? AND location = ? AND latitude = ? AND longitude = ? AND email = ?",
        [store_name, location, latitude, longitude, email]
    );

    if (existingWholesaler.length > 0) {
        return res.status(409).json({
            error: "Conflict",
            message: "A wholesaler with the same store name, location, latitude, and longitude already exists",
            statusCode: 409,
            status: "error"
        });
    }
    
    try {
        const query = `
      INSERT INTO wholesalers (
        store_name,
        current_status,
        open_time,
        close_time,
        distance,
        duration,
        email,
        location,
        longitude,
        latitude
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

        const values = [
            store_name,
            current_status,
            open_time,
            close_time,
            distance,
            duration,
            email,
            location, // Optional field
            longitude , // Optional field
            latitude // Optional field
        ];

        await userQuery(query, values);

        return res.status(201).json({
            message: "Wholeseller added successfully",
            statusCode: 201,
            status: "success",
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

const getWholesalers = async (req, res) => {
    let { latitude, longitude } = req.params;

    if (!latitude || !longitude) {
        return res.status(400).json({
            error: "Missing latitude or longitude",
            statusCode: 400,
            status: "error",
        });
    }

    try {
        const query = `SELECT * FROM wholesalers`;
        const wholesalers = await userQuery(query);

        if (wholesalers.length === 0) {
            return res.status(404).json({
                message: "No wholesalers found",
                statusCode: 404,
                status: "success",
                data: []
            });
        }

        const userLocation = {
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude)
        };
        
        // Filter only those within 50km
        const filteredWholesalers = wholesalers
            .map((wholesaler) => {
                const distance = getDistance(userLocation, {
                    latitude: parseFloat(wholesaler.latitude),
                    longitude: parseFloat(wholesaler.longitude)
                });
                // console.log('wholesaler distance', latitude, longitude, wholesaler.latitude, wholesaler.longitude);
                // console.log('user distance', userLocation.latitude, userLocation.longitude);
                // console.log(`Distance from user to ${wholesaler.store_name}: ${distance / 1000} km`);
                return {
                    ...wholesaler,
                    distanceInKm: distance / 1000
                };
            })
            .filter((w) => w.distanceInKm <= 50)
            .sort((a, b) => a.distanceInKm - b.distanceInKm);

        if (filteredWholesalers.length === 0) {
            return res.status(404).json({
                message: "No wholesalers found within 50km",
                statusCode: 404,
                status: "success",
                data: []
            });
        }

        return res.status(200).json({
            message: "Nearby wholesalers retrieved successfully",
            statusCode: 200,
            status: "success",
            data: filteredWholesalers
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

const updateWholesaler = async (req, res) => {
    const { id } = req.params;
    const {
        store_name,
        current_status,
        open_time,
        close_time,
        distance,
        duration,
        email,
        location,
        longitude,
        latitude
    } = req.body;

    const user = req.user;

    // Check if the userType is admin
    if (!user || user.userType !== "admin") {
        return res.status(403).json({
            error: "Forbidden",
            message: "You are not authorized to perform this action",
            statusCode: 403,
            status: "error"
        });
    }

    // Collect all fields that are provided
    const fieldsToUpdate = {};
    if (store_name !== undefined) fieldsToUpdate.store_name = store_name;
    if (current_status !== undefined) fieldsToUpdate.current_status = current_status;
    if (open_time !== undefined) fieldsToUpdate.open_time = open_time;
    if (close_time !== undefined) fieldsToUpdate.close_time = close_time;
    if (distance !== undefined) fieldsToUpdate.distance = distance;
    if (duration !== undefined) fieldsToUpdate.duration = duration;
    if (email !== undefined) fieldsToUpdate.email = email;
    if (location !== undefined) fieldsToUpdate.location = location;
    if (longitude !== undefined) fieldsToUpdate.longitude = longitude;
    if (latitude !== undefined) fieldsToUpdate.latitude = latitude;

    // Check if at least one field is provided
    if (Object.keys(fieldsToUpdate).length === 0) {
        return res.status(400).json({
            error: "Bad Request",
            message: "At least one field must be provided to update",
            statusCode: 400,
            status: "error",
        });
    }

    try {
        // Build SET clause dynamically
        const setClause = Object.keys(fieldsToUpdate)
            .map(field => `${field} = ?`)
            .join(", ");

        const values = Object.values(fieldsToUpdate);
        values.push(id); // for the WHERE clause

        const query = `UPDATE wholesalers SET ${setClause} WHERE id = ?`;

        const result = await userQuery(query, values);
        console.log("Update Result:", result);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: "Not Found",
                message: "Wholesaler not found",
                statusCode: 404,
                status: "error"
            });
        }

        return res.status(200).json({
            message: "Wholesaler updated successfully",
            statusCode: 200,
            status: "success",
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

const deleteWholesaler = async (req, res) => {
    const { id } = req.params;
    const user = req.user;

    // Check if the userType is admin
    if (!user || user.userType !== "admin") {
        return res.status(403).json({
            error: "Forbidden",
            message: "You are not authorized to perform this action",
            statusCode: 403,
            status: "error"
        });
    }

    try {
        const query = `DELETE FROM wholesalers WHERE id = ?`;
        const result = await userQuery(query, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: "Not Found",
                message: "Wholesaler not found",
                statusCode: 404,
                status: "error"
            });
        }

        return res.status(200).json({
            message: "Wholesaler deleted successfully",
            statusCode: 200,
            status: "success",
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
    addWholesaler,
    getWholesalers,
    updateWholesaler,
    deleteWholesaler
}