import { sendPushNotification } from '../../../shared/services/firebaseAdmin.js';
import User from '../../auth/models/User.js';
import Restaurant from '../../restaurant/models/Restaurant.js';
import Delivery from '../../delivery/models/Delivery.js';

/**
 * Send push notification to a user
 * @param {string} userId - User, Restaurant, or Delivery ID
 * @param {string} userType - 'user' | 'restaurant' | 'delivery'
 * @param {Object} payload - { title, body, data }
 */
export const sendOrderPushNotification = async (userId, userType, payload) => {
    try {
        let tokens = [];
        let model;

        if (userType === 'user') model = User;
        else if (userType === 'restaurant') model = Restaurant;
        else if (userType === 'delivery') model = Delivery;

        const record = await model.findById(userId).select('fcmTokens fcmTokenMobile');
        if (!record) {
            console.warn(`[Push Notification] ${userType} not found with ID: ${userId}`);
            return;
        }

        // Combine both web and mobile tokens
        tokens = [...(record.fcmTokens || []), ...(record.fcmTokenMobile || [])];

        // Remove duplicates and empty values
        tokens = [...new Set(tokens)].filter(Boolean);

        if (tokens.length === 0) {
            console.log(`[Push Notification] No FCM tokens found for ${userType} ${userId}`);
            return;
        }

        console.log(`🚀 [Push Notification] Sending to ${userType} ${userId} (${tokens.length} tokens): ${payload.title}`);

        // Add default icon if not provided
        if (!payload.data) payload.data = {};
        payload.data.icon = payload.data.icon || '/notification-logo.png';

        await sendPushNotification(tokens, {
            title: payload.title,
            body: payload.body,
            data: payload.data
        });

    } catch (error) {
        console.error(`[Push Notification] Error sending to ${userType}:`, error);
    }
};
