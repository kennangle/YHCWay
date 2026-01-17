import * as brevo from '@getbrevo/brevo';
import { storage } from './storage';

const brevoApiKey = process.env.BREVO_API_KEY || '';

const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, brevoApiKey);

// Get sender email from environment variable or use default
const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'noreply@yhcway.com';
const SENDER_NAME = process.env.BREVO_SENDER_NAME || 'The YHC Way';

// Default invitation email template
const DEFAULT_INVITATION_SUBJECT = "Welcome to The YHC Way!";
const DEFAULT_INVITATION_HTML = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #333; text-align: center;">The YHC Way</h1>
  <h2 style="color: #666;">Welcome, {{firstName}}!</h2>
  <p style="color: #444; line-height: 1.6;">
    You've been invited to join The YHC Way - your unified workspace for managing all your work tools in one place.
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
       style="background-color: #FD971E; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
      Log In to The YHC Way
    </a>
  </div>
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="color: #999; font-size: 12px; text-align: center;">
    The YHC Way - Your Unified Workspace
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
    sendSmtpEmail.sender = { name: SENDER_NAME, email: SENDER_EMAIL };
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
    console.log(`[Email] Attempting to send password reset email to ${to}`);
    console.log(`[Email] Using sender: ${SENDER_NAME} <${SENDER_EMAIL}>`);
    
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
    sendSmtpEmail.sender = { name: SENDER_NAME, email: SENDER_EMAIL };
    sendSmtpEmail.to = [{ email: to }];

    console.log(`[Email] Calling Brevo API...`);
    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`[Email] Password reset email sent successfully to ${to}`);
    console.log(`[Email] Brevo response:`, JSON.stringify(response.body || response));
    return true;
  } catch (error: any) {
    console.error("[Email] Error sending password reset email:", error?.message || error);
    if (error?.response?.body) {
      console.error("[Email] Brevo API error details:", JSON.stringify(error.response.body));
    }
    if (error?.response?.data) {
      console.error("[Email] Brevo API response data:", JSON.stringify(error.response.data));
    }
    if (error?.response?.status) {
      console.error("[Email] Brevo API status:", error.response.status);
    }
    console.error("[Email] Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
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

// Default templates for all template types
const DEFAULT_WELCOME_SUBJECT = "Welcome to UniWork!";
const DEFAULT_WELCOME_HTML = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #FD971E; text-align: center;">Welcome to UniWork!</h1>
  <h2 style="color: #666;">Hello {{firstName}},</h2>
  <p style="color: #444; line-height: 1.6;">
    Welcome to your new unified workspace! We're excited to have you on board.
  </p>
  <p style="color: #444; line-height: 1.6;">
    UniWork brings all your work tools together in one place - email, calendar, tasks, and more.
  </p>
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{loginUrl}}" 
       style="background-color: #FD971E; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
      Get Started
    </a>
  </div>
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="color: #999; font-size: 12px; text-align: center;">
    UniWork - Your Unified Workspace
  </p>
</div>
`;

const DEFAULT_NEWSLETTER_SUBJECT = "UniWork Newsletter";
const DEFAULT_NEWSLETTER_HTML = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #FD971E; text-align: center;">UniWork Updates</h1>
  <h2 style="color: #666;">Hello {{firstName}},</h2>
  <p style="color: #444; line-height: 1.6;">
    Here are the latest updates and announcements from UniWork.
  </p>
  <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <p style="color: #444;">Add your newsletter content here...</p>
  </div>
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="color: #999; font-size: 12px; text-align: center;">
    UniWork - Your Unified Workspace
  </p>
</div>
`;

const DEFAULT_NOTIFICATION_SUBJECT = "UniWork Notification";
const DEFAULT_NOTIFICATION_HTML = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #FD971E; text-align: center;">Notification</h1>
  <h2 style="color: #666;">Hello {{firstName}},</h2>
  <p style="color: #444; line-height: 1.6;">
    You have a new notification from UniWork.
  </p>
  <div style="background-color: #fff8f0; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #FD971E;">
    <p style="color: #444;">Notification content goes here...</p>
  </div>
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{loginUrl}}" 
       style="background-color: #FD971E; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
      View Details
    </a>
  </div>
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="color: #999; font-size: 12px; text-align: center;">
    UniWork - Your Unified Workspace
  </p>
</div>
`;

const DEFAULT_CUSTOM_SUBJECT = "Custom Email";
const DEFAULT_CUSTOM_HTML = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #FD971E; text-align: center;">UniWork</h1>
  <p style="color: #444; line-height: 1.6;">
    Start designing your custom email template here. Use variables like {{firstName}}, {{lastName}}, and {{email}} to personalize your messages.
  </p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="color: #999; font-size: 12px; text-align: center;">
    UniWork - Your Unified Workspace
  </p>
</div>
`;

// Get default template content
export function getDefaultTemplate(templateType: string): { subject: string; htmlContent: string } | null {
  switch (templateType) {
    case 'invitation':
      return { subject: DEFAULT_INVITATION_SUBJECT, htmlContent: DEFAULT_INVITATION_HTML };
    case 'password_reset':
      return { subject: DEFAULT_RESET_SUBJECT, htmlContent: DEFAULT_RESET_HTML };
    case 'welcome':
      return { subject: DEFAULT_WELCOME_SUBJECT, htmlContent: DEFAULT_WELCOME_HTML };
    case 'newsletter':
      return { subject: DEFAULT_NEWSLETTER_SUBJECT, htmlContent: DEFAULT_NEWSLETTER_HTML };
    case 'notification':
      return { subject: DEFAULT_NOTIFICATION_SUBJECT, htmlContent: DEFAULT_NOTIFICATION_HTML };
    case 'custom':
      return { subject: DEFAULT_CUSTOM_SUBJECT, htmlContent: DEFAULT_CUSTOM_HTML };
    default:
      return null;
  }
}

// =============================================================================
// NOTIFICATION EMAILS
// =============================================================================

const NOTIFICATION_TASK_ASSIGNED_HTML = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #FD971E; text-align: center;">UniWork</h1>
  <h2 style="color: #333;">New Task Assigned to You</h2>
  <div style="background-color: #fff8f0; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #FD971E;">
    <h3 style="margin: 0 0 10px 0; color: #333;">{{taskTitle}}</h3>
    <p style="margin: 5px 0; color: #666;"><strong>Project:</strong> {{projectName}}</p>
    <p style="margin: 5px 0; color: #666;"><strong>Assigned by:</strong> {{assignerName}}</p>
    {{#if dueDate}}<p style="margin: 5px 0; color: #666;"><strong>Due:</strong> {{dueDate}}</p>{{/if}}
    {{#if priority}}<p style="margin: 5px 0; color: #666;"><strong>Priority:</strong> {{priority}}</p>{{/if}}
  </div>
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{taskUrl}}" 
       style="background-color: #FD971E; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
      View Task
    </a>
  </div>
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="color: #999; font-size: 12px; text-align: center;">
    You're receiving this because you have task assignment notifications enabled in UniWork.
  </p>
</div>
`;

const NOTIFICATION_TASK_DUE_HTML = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #FD971E; text-align: center;">UniWork</h1>
  <h2 style="color: #333;">Task Due Reminder</h2>
  <div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff9800;">
    <h3 style="margin: 0 0 10px 0; color: #333;">{{taskTitle}}</h3>
    <p style="margin: 5px 0; color: #666;"><strong>Project:</strong> {{projectName}}</p>
    <p style="margin: 5px 0; color: #e65100;"><strong>Due:</strong> {{dueDate}}</p>
  </div>
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{taskUrl}}" 
       style="background-color: #FD971E; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
      View Task
    </a>
  </div>
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="color: #999; font-size: 12px; text-align: center;">
    You're receiving this because you have task due notifications enabled in UniWork.
  </p>
</div>
`;

const NOTIFICATION_CALENDAR_CONFLICT_HTML = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #FD971E; text-align: center;">UniWork</h1>
  <h2 style="color: #333;">Calendar Conflict Detected</h2>
  <div style="background-color: #ffebee; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f44336;">
    <p style="margin: 0 0 15px 0; color: #666;">You have overlapping events:</p>
    <div style="background: white; padding: 15px; border-radius: 6px; margin-bottom: 10px;">
      <p style="margin: 0; font-weight: bold; color: #333;">{{event1Title}}</p>
      <p style="margin: 5px 0 0 0; color: #666;">{{event1Time}}</p>
    </div>
    <div style="background: white; padding: 15px; border-radius: 6px;">
      <p style="margin: 0; font-weight: bold; color: #333;">{{event2Title}}</p>
      <p style="margin: 5px 0 0 0; color: #666;">{{event2Time}}</p>
    </div>
  </div>
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{calendarUrl}}" 
       style="background-color: #FD971E; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
      View Calendar
    </a>
  </div>
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="color: #999; font-size: 12px; text-align: center;">
    You're receiving this because you have calendar conflict notifications enabled in UniWork.
  </p>
</div>
`;

export async function sendTaskAssignedNotification(
  to: string, 
  taskTitle: string, 
  projectName: string, 
  assignerName: string,
  taskUrl: string,
  dueDate?: string,
  priority?: string
): Promise<boolean> {
  try {
    const variables: Record<string, string> = {
      taskTitle,
      projectName,
      assignerName,
      taskUrl,
      dueDate: dueDate || '',
      priority: priority || ''
    };
    
    let htmlContent = replaceTemplateVariables(NOTIFICATION_TASK_ASSIGNED_HTML, variables);
    // Handle conditional blocks
    if (!dueDate) {
      htmlContent = htmlContent.replace(/\{\{#if dueDate\}\}[\s\S]*?\{\{\/if\}\}/g, '');
    } else {
      htmlContent = htmlContent.replace(/\{\{#if dueDate\}\}([\s\S]*?)\{\{\/if\}\}/g, '$1');
    }
    if (!priority) {
      htmlContent = htmlContent.replace(/\{\{#if priority\}\}[\s\S]*?\{\{\/if\}\}/g, '');
    } else {
      htmlContent = htmlContent.replace(/\{\{#if priority\}\}([\s\S]*?)\{\{\/if\}\}/g, '$1');
    }
    
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.subject = `New Task: ${taskTitle}`;
    sendSmtpEmail.htmlContent = htmlContent;
    sendSmtpEmail.sender = { name: SENDER_NAME, email: SENDER_EMAIL };
    sendSmtpEmail.to = [{ email: to }];

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`[Notification] Task assigned email sent to ${to}`);
    return true;
  } catch (error) {
    console.error("[Notification] Error sending task assigned email:", error);
    return false;
  }
}

export async function sendTaskDueNotification(
  to: string, 
  taskTitle: string, 
  projectName: string, 
  taskUrl: string,
  dueDate: string
): Promise<boolean> {
  try {
    const variables = { taskTitle, projectName, taskUrl, dueDate };
    const htmlContent = replaceTemplateVariables(NOTIFICATION_TASK_DUE_HTML, variables);
    
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.subject = `Task Due Soon: ${taskTitle}`;
    sendSmtpEmail.htmlContent = htmlContent;
    sendSmtpEmail.sender = { name: SENDER_NAME, email: SENDER_EMAIL };
    sendSmtpEmail.to = [{ email: to }];

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`[Notification] Task due email sent to ${to}`);
    return true;
  } catch (error) {
    console.error("[Notification] Error sending task due email:", error);
    return false;
  }
}

export async function sendCalendarConflictNotification(
  to: string, 
  event1Title: string, 
  event1Time: string,
  event2Title: string, 
  event2Time: string,
  calendarUrl: string
): Promise<boolean> {
  try {
    const variables = { event1Title, event1Time, event2Title, event2Time, calendarUrl };
    const htmlContent = replaceTemplateVariables(NOTIFICATION_CALENDAR_CONFLICT_HTML, variables);
    
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.subject = `Calendar Conflict: ${event1Title} vs ${event2Title}`;
    sendSmtpEmail.htmlContent = htmlContent;
    sendSmtpEmail.sender = { name: SENDER_NAME, email: SENDER_EMAIL };
    sendSmtpEmail.to = [{ email: to }];

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`[Notification] Calendar conflict email sent to ${to}`);
    return true;
  } catch (error) {
    console.error("[Notification] Error sending calendar conflict email:", error);
    return false;
  }
}

// Admin notification for YHCTime account link changes
const YHCTIME_LINK_CHANGE_HTML = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #FD971E; text-align: center;">The YHC Way</h1>
  <h2 style="color: #666;">YHCTime Account Link Changed</h2>
  <p style="color: #444; line-height: 1.6;">
    A user has changed their linked YHCTime employee account:
  </p>
  <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <p style="margin: 5px 0;"><strong>User:</strong> {{userName}} ({{userEmail}})</p>
    <p style="margin: 5px 0;"><strong>Previous Account:</strong> {{previousEmployee}}</p>
    <p style="margin: 5px 0;"><strong>New Account:</strong> {{newEmployee}} ({{newEmployeeEmail}})</p>
    <p style="margin: 5px 0;"><strong>Changed at:</strong> {{changedAt}}</p>
  </div>
  <p style="color: #666; font-size: 14px;">
    This is an automated notification from The YHC Way time tracking system.
  </p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="color: #999; font-size: 12px; text-align: center;">
    The YHC Way - Your Unified Workspace
  </p>
</div>
`;

export async function sendYHCTimeLinkChangeNotification(
  adminEmails: string[],
  userName: string,
  userEmail: string,
  previousEmployee: string | null,
  newEmployee: string,
  newEmployeeEmail: string
): Promise<boolean> {
  if (adminEmails.length === 0) {
    console.log('[Notification] No admin emails to notify about YHCTime link change');
    return true;
  }
  
  try {
    const changedAt = new Date().toLocaleString('en-US', { 
      timeZone: 'America/Los_Angeles',
      dateStyle: 'medium',
      timeStyle: 'short'
    });
    
    const variables = { 
      userName, 
      userEmail, 
      previousEmployee: previousEmployee || 'None (first link)',
      newEmployee,
      newEmployeeEmail,
      changedAt
    };
    const htmlContent = replaceTemplateVariables(YHCTIME_LINK_CHANGE_HTML, variables);
    
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.subject = `YHCTime Link Changed: ${userName}`;
    sendSmtpEmail.htmlContent = htmlContent;
    sendSmtpEmail.sender = { name: SENDER_NAME, email: SENDER_EMAIL };
    sendSmtpEmail.to = adminEmails.map(email => ({ email }));

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`[Notification] YHCTime link change email sent to ${adminEmails.length} admin(s)`);
    return true;
  } catch (error) {
    console.error("[Notification] Error sending YHCTime link change email:", error);
    return false;
  }
}
