import { mailtrapClient, sender } from "../lib/mailtrap.js";
import {
  createCommentNotificationEmailTemplate,
  createWelcomeEmailTemplate,
} from "../emails/emailTemplates.js";

export const sendWelcomeEmail = async (email, name, profileUrl) => {
  const recipient = [{ email }];
  try {
    const response = await mailtrapClient.send({
      from: sender,
      to: recipient,
      subject: "Welcome to UnLinked!",
      html: createWelcomeEmailTemplate(name, profileUrl),
      category: "welcome",
    });
    console.log("Welcome email sent successfully", response);
  } catch (error) {
    console.error("Error sending welcome email:", error.message);
    throw error;
  }
};

export const sendCommentNotificationEmail = async (
  recipientEmail,
  recipientName,
  commenterName,
  commentContent,
  postUrl
) => {
  const recipient = [{ email }];
  try {
    const response = await mailtrapClient.send({
      from: sender,
      to: recipientEmail,
      subject: "New comment on your post",
      html: createCommentNotificationEmailTemplate(
        recipientName,
        commenterName,
        commentContent,
        postUrl
      ),
      category: "comment_notification",
    });
    console.log("Comment notification email sent successfully", response);
  } catch (error) {
    throw error;
  }
};
