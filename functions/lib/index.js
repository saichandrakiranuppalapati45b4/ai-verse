"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUserAccount = exports.sendTeamAccessEmail = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
const RESEND_API_KEY = "re_NaVPe4gE_D3NMQ6wNbAgGawf4EHL2s29X";
// ─── Send Team Access Email via Resend (server-side, no CORS issues) ───
exports.sendTeamAccessEmail = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "You must be logged in to send emails.");
    }
    const { to, subject, html, from } = data;
    if (!to || !subject || !html) {
        throw new functions.https.HttpsError("invalid-argument", "Missing required fields: to, subject, html.");
    }
    const recipients = Array.isArray(to) ? to : [to];
    const senderEmail = from || "AI Verse <events@aiversevitb.dpdns.org>";
    try {
        const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${RESEND_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                from: senderEmail,
                to: recipients,
                subject,
                html,
            }),
        });
        const result = await response.json();
        if (!response.ok) {
            console.error("Resend API Error:", result);
            throw new functions.https.HttpsError("internal", result.message || "Failed to send email via Resend.");
        }
        return { success: true, data: result };
    }
    catch (err) {
        console.error("Error sending email via Resend:", err);
        throw new functions.https.HttpsError("internal", err.message || "Network error sending email.");
    }
});
exports.deleteUserAccount = functions.https.onCall(async (data, context) => {
    var _a;
    // 1. Verify caller is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "You must be logged in to delete a user.");
    }
    const callerUid = context.auth.uid;
    const targetUid = data.uid;
    if (!targetUid) {
        throw new functions.https.HttpsError("invalid-argument", "The function must be called with one argument 'uid' containing the user ID to delete.");
    }
    // 2. Verify caller is an admin/faculty
    try {
        const callerDoc = await admin.firestore().collection("users").doc(callerUid).get();
        if (!callerDoc.exists) {
            throw new functions.https.HttpsError("permission-denied", "User profile not found.");
        }
        const role = ((_a = callerDoc.data()) === null || _a === void 0 ? void 0 : _a.role) || "member";
        const roleLower = role.toLowerCase();
        const isFaculty = roleLower.includes("faculty") ||
            roleLower.includes("advisor") ||
            roleLower.includes("coordinator") ||
            roleLower.includes("admin") ||
            roleLower.includes("super");
        if (!isFaculty) {
            throw new functions.https.HttpsError("permission-denied", "Only faculty/admins can delete user accounts.");
        }
    }
    catch (error) {
        console.error("Error verifying caller role:", error);
        throw new functions.https.HttpsError("internal", "Error verifying permissions.");
    }
    // 3. Prevent self-deletion via this function (extra safety)
    if (callerUid === targetUid) {
        throw new functions.https.HttpsError("invalid-argument", "You cannot delete your own account via this method.");
    }
    // 4. Delete from Firebase Authentication
    try {
        await admin.auth().deleteUser(targetUid);
        console.log(`Successfully deleted auth user: ${targetUid}`);
    }
    catch (error) {
        console.error("Error deleting auth user:", error);
        // Continue even if auth deletion fails, maybe they are already deleted
    }
    // 5. Delete from Firestore
    try {
        await admin.firestore().collection("users").doc(targetUid).delete();
        console.log(`Successfully deleted firestore document for user: ${targetUid}`);
    }
    catch (error) {
        console.error("Error deleting firestore document:", error);
        throw new functions.https.HttpsError("internal", "Failed to delete user document from database.");
    }
    return { success: true, message: `User ${targetUid} successfully deleted.` };
});
//# sourceMappingURL=index.js.map