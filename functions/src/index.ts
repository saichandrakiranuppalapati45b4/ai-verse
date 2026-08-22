import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const RESEND_API_KEY = "re_NaVPe4gE_D3NMQ6wNbAgGawf4EHL2s29X";

// ─── Send Team Access Email via Resend (server-side, no CORS issues) ───
export const sendTeamAccessEmail = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be logged in to send emails."
    );
  }

  const { to, subject, html, from } = data;

  if (!to || !subject || !html) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Missing required fields: to, subject, html."
    );
  }

  const recipients = Array.isArray(to) ? to : [to];
  const senderEmail = from || "AI Verse <noreply@aiversevitb.dpdns.org>";

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
      throw new functions.https.HttpsError(
        "internal",
        result.message || "Failed to send email via Resend."
      );
    }

    return { success: true, data: result };
  } catch (err: any) {
    console.error("Error sending email via Resend:", err);
    throw new functions.https.HttpsError(
      "internal",
      err.message || "Network error sending email."
    );
  }
});

export const deleteUserAccount = functions.https.onCall(async (data, context) => {
  // 1. Verify caller is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be logged in to delete a user."
    );
  }

  const callerUid = context.auth.uid;
  const targetUid = data.uid;

  if (!targetUid) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "The function must be called with one argument 'uid' containing the user ID to delete."
    );
  }

  // 2. Verify caller is an admin/faculty
  try {
    const callerDoc = await admin.firestore().collection("users").doc(callerUid).get();
    if (!callerDoc.exists) {
      throw new functions.https.HttpsError("permission-denied", "User profile not found.");
    }
    
    const role = callerDoc.data()?.role || "member";
    const roleLower = role.toLowerCase();
    
    const isFaculty = roleLower.includes("faculty") || 
                      roleLower.includes("advisor") || 
                      roleLower.includes("coordinator") || 
                      roleLower.includes("admin") || 
                      roleLower.includes("super");
                      
    if (!isFaculty) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only faculty/admins can delete user accounts."
      );
    }
  } catch (error) {
    console.error("Error verifying caller role:", error);
    throw new functions.https.HttpsError("internal", "Error verifying permissions.");
  }

  // 3. Prevent self-deletion via this function (extra safety)
  if (callerUid === targetUid) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "You cannot delete your own account via this method."
    );
  }

  // 4. Delete from Firebase Authentication
  try {
    await admin.auth().deleteUser(targetUid);
    console.log(`Successfully deleted auth user: ${targetUid}`);
  } catch (error) {
    console.error("Error deleting auth user:", error);
    // Continue even if auth deletion fails, maybe they are already deleted
  }

  // 5. Delete from Firestore
  try {
    await admin.firestore().collection("users").doc(targetUid).delete();
    console.log(`Successfully deleted firestore document for user: ${targetUid}`);
  } catch (error) {
    console.error("Error deleting firestore document:", error);
    throw new functions.https.HttpsError("internal", "Failed to delete user document from database.");
  }

  return { success: true, message: `User ${targetUid} successfully deleted.` };
});
