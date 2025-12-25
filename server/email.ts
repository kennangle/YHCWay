import * as brevo from '@getbrevo/brevo';
import { storage } from './storage';

const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY || '');

// Default invitation email template
const DEFAULT_INVITATION_SUBJECT = "Welcome to UniWork!";
const DEFAULT_INVITATION_HTML = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #333; text-align: center;">UniWork</h1>
  <h2 style="color: #666;">Welcome, {{firstName}}!</h2>
  <p style="color: #444; line-height: 1.6;">
    You've been invited to join UniWork - your unified workspace for managing all your work tools in one place.
  </p>
  <p style="color: #444; line-height: 1.6;">
    Here are your login credentials:
  </p>
  <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <p style="margin: 5px 0;"><strong>Email:</strong> {{email}}</p>
    <p style="margin: 5px 0;"><strong>Temporary Password:</strong> {{password}}</p>
  </div>
  <p style="color: #444; line-height: 1.6;">
    We recommend changing your password after your first login.
  </p>
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{loginUrl}}" 
       style="background-color: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
      Log In to UniWork
    </a>
  </div>
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="color: #999; font-size: 12px; text-align: center;">
    UniWork - Your Unified Workspace
  </p>
</div>
`;

// Replace template variables with actual values
function replaceTemplateVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return result;
}

export async function sendInvitationEmail(to: string, firstName: string, tempPassword: string, loginUrl: string): Promise<boolean> {
  try {
    // Try to get custom template from database
    const customTemplate = await storage.getEmailTemplate('invitation');
    
    const subject = customTemplate?.subject || DEFAULT_INVITATION_SUBJECT;
    const htmlTemplate = customTemplate?.htmlContent || DEFAULT_INVITATION_HTML;
    
    // Replace template variables
    const variables = {
      firstName,
      email: to,
      password: tempPassword,
      loginUrl
    };
    const htmlContent = replaceTemplateVariables(htmlTemplate, variables);
    
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.subject = replaceTemplateVariables(subject, variables);
    sendSmtpEmail.htmlContent = htmlContent;
    sendSmtpEmail.sender = { name: "UniWork", email: "noreply@uniwork.app" };
    sendSmtpEmail.to = [{ email: to }];

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`Invitation email sent to ${to}`);
    return true;
  } catch (error) {
    console.error("Error sending invitation email:", error);
    return false;
  }
}

// Default password reset template
const DEFAULT_RESET_SUBJECT = "Reset Your UniWork Password";
const DEFAULT_RESET_HTML = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #333; text-align: center;">UniWork</h1>
  <h2 style="color: #666;">Password Reset Request</h2>
  <p style="color: #444; line-height: 1.6;">
    We received a request to reset your password. Click the button below to create a new password:
  </p>
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{resetLink}}" 
       style="background-color: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
      Reset Password
    </a>
  </div>
  <p style="color: #666; font-size: 14px;">
    This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.
  </p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="color: #999; font-size: 12px; text-align: center;">
    UniWork - Your Unified Workspace
  </p>
</div>
`;

export async function sendPasswordResetEmail(to: string, resetLink: string): Promise<boolean> {
  try {
    // Try to get custom template from database
    const customTemplate = await storage.getEmailTemplate('password_reset');
    
    const subject = customTemplate?.subject || DEFAULT_RESET_SUBJECT;
    const htmlTemplate = customTemplate?.htmlContent || DEFAULT_RESET_HTML;
    
    // Replace template variables
    const variables = { resetLink, email: to };
    const htmlContent = replaceTemplateVariables(htmlTemplate, variables);
    
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.subject = replaceTemplateVariables(subject, variables);
    sendSmtpEmail.htmlContent = htmlContent;
    sendSmtpEmail.sender = { name: "UniWork", email: "noreply@uniwork.app" };
    sendSmtpEmail.to = [{ email: to }];

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`Password reset email sent to ${to}`);
    return true;
  } catch (error) {
    console.error("Error sending password reset email:", error);
    return false;
  }
}

// Get the list of available template types with their descriptions
export function getTemplateTypes() {
  return [
    { 
      type: 'invitation', 
      name: 'User Invitation', 
      description: 'Sent when a new user is created',
      variables: ['firstName', 'email', 'password', 'loginUrl']
    },
    { 
      type: 'password_reset', 
      name: 'Password Reset', 
      description: 'Sent when a user requests to reset their password',
      variables: ['resetLink', 'email']
    }
  ];
}

// Get default template content
export function getDefaultTemplate(templateType: string): { subject: string; htmlContent: string } | null {
  switch (templateType) {
    case 'invitation':
      return { subject: DEFAULT_INVITATION_SUBJECT, htmlContent: DEFAULT_INVITATION_HTML };
    case 'password_reset':
      return { subject: DEFAULT_RESET_SUBJECT, htmlContent: DEFAULT_RESET_HTML };
    default:
      return null;
  }
}
