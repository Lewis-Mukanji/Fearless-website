const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 456,
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false // This helps with some connection issues
  }
});

const getEmailTemplate = async (templateData, templateType = 'contact') => {
  try {
    let template;
    
    if (templateType === 'admin-created') {
      template = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { color: #2c3e50; text-align: center; }
            .info-box { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .footer { margin-top: 30px; font-size: 14px; color: #6c757d; text-align: center; }
            .button { 
              display: inline-block; 
              padding: 10px 20px; 
              background-color: #28a745; 
              color: white; 
              text-decoration: none; 
              border-radius: 5px; 
              margin-top: 15px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2 class="header">Your Admin Account Has Been Created</h2>
            
            <p>Welcome to the admin panel! Your account has been successfully created:</p>
            
            <div class="info-box">
              <p><strong>Username:</strong> ${templateData.username}</p>
              <p><strong>Account Type:</strong> ${templateData.is_super_admin ? 'Super Admin' : 'Admin'}</p>
              <p><strong>Created At:</strong> ${new Date().toLocaleString()}</p>
              <p><strong>Temporary Password:</strong> ${templateData.password}</p>
            </div>
            
            <p>You now have access to the admin dashboard with ${templateData.is_super_admin ? 'full' : 'limited'} privileges.</p>
            <p class="important">For security reasons, please change your password immediately after logging in.</p>
            
            <div style="text-align: center;">
              <a href="${process.env.ADMIN_PANEL_URL}" class="button">Access Admin Panel</a>
            </div>
            
            <div class="footer">
              <p>If you didn't request this account, please contact the system administrator immediately.</p>
              <p>&copy; ${new Date().getFullYear()} The Fearless Movement. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>    
      `;
    } else if (templateType === 'user-welcome') {
      template = `
          <!DOCTYPE html>
          <html>
          <head>
              <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { color: #2c3e50; text-align: center; }
                  .welcome { font-size: 18px; margin-bottom: 20px; }
                  .credentials { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
                  .important { color: #dc3545; font-weight: bold; }
                  .footer { margin-top: 30px; font-size: 14px; color: #6c757d; text-align: center; }
                  .button { 
                      display: inline-block; 
                      padding: 10px 20px; 
                      background-color: #007bff; 
                      color: white; 
                      text-decoration: none; 
                      border-radius: 5px; 
                      margin-top: 15px;
                  }
              </style>
          </head>
          <body>
              <div class="container">
                  <h2 class="header">Welcome to The Fearless Movement!</h2>
                  
                  <p class="welcome">Dear ${templateData.username},</p>
                  
                  <p>Your account has been successfully created. Below are your login credentials:</p>
                  
                  <div class="credentials">
                      <p><strong>Username:</strong> ${templateData.username}</p>
                      <p><strong>Email:</strong> ${templateData.email}</p>
                      <p><strong>Password:</strong> ${templateData.password}</p>
                  </div>
                  
                  <p class="important">Please keep this password secure and do not share it with anyone.</p>
                  
                  <p>You can now log in to your account using these credentials. We recommend changing your password after your first login.</p>
                  
                  <div style="text-align: center;">
                      <a href="http://127.0.0.1:5501/we%20the%20fearless/login.html" class="button">Login to Your Account</a>
                  </div>
                  
                  <div class="footer">
                      <p>If you didn't request this account, please contact our support team immediately.</p>
                      <p>&copy; ${new Date().getFullYear()} The Fearless Movement. All rights reserved.</p>
                  </div>
              </div>
          </body>
          </html>
      `;
    } else if (templateType === 'login') {
      template = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .login-info { background-color: #f4f4f4; padding: 15px; border-radius: 5px; }
            .warning { color: #dc3545; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Login Notification</h2>
            <p>A login has been detected for your admin account:</p>
            
            <div class="login-info">
              <p><strong>Username:</strong> ${templateData.username}</p>
              <p><strong>Login Time:</strong> ${templateData.loginTime}</p>
              <p><strong>IP Address:</strong> ${templateData.ipAddress}</p>
            </div>
            
            <p class="warning">If this was not you, please secure your account immediately by changing your password.</p>
          </div>
        </body>
        </html>
      `;
    } else if (templateType === 'ticket') {
      template = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .ticket-info { margin-top: 20px; }
            .qr-code { margin-top: 20px; }
            .header { color: #2c3e50; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2 class="header">Your Ticket Purchase Confirmation</h2>
            <p>Thank you for purchasing a ticket. Below are your ticket details:</p>
            
            <div class="ticket-info">
              <p><strong>Ticket Number:</strong> ${templateData.ticketNumber}</p>
              <p><strong>Ticket Type:</strong> ${templateData.ticketType}</p>
              <p><strong>Quantity:</strong> ${templateData.quantity}</p>
              <p><strong>Total Cost:</strong> KSh ${templateData.totalCost}</p>
            </div>
            
            <div class="qr-code">
              <p><strong>QR Code:</strong></p>
              <img src="${templateData.qrCodeImage}" alt="QR Code" />
              <p>Present this QR code at the event for entry.</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (templateType === 'order') {
      const itemsList = templateData.items.map(item => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.quantity}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">KSh ${item.price}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">KSh ${item.price * item.quantity}</td>
        </tr>
      `).join('');

      template = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #f8f9fa; text-align: left; padding: 10px; }
            .total { font-weight: bold; margin-top: 20px; }
            .highlight { background-color: #f8f9fa; padding: 10px; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>New Order Received</h2>
            <p>A new order has been placed from the merchandise store.</p>
            
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Quantity</th>
                  <th>Price</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${itemsList}
              </tbody>
            </table>
            
            <div class="highlight">
              <p class="total">Total Amount: KSh ${templateData.total}</p>
              <p>Order Date: ${templateData.orderDate}</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (templateType === 'donation') {
      template = await fs.readFile(path.join(__dirname, 'donations-email.html'), 'utf8');
      
      // Replace placeholders in the donation template
      template = template.replace(/{name}/g, templateData.name || '');
      template = template.replace(/{email}/g, templateData.email || '');
      template = template.replace(/{phone}/g, templateData.phone || '');
      template = template.replace(/{address}/g, templateData.address || '');
      template = template.replace(/{donorType}/g, templateData.donorType || '');
      template = template.replace(/{paymentMethod}/g, templateData.paymentMethod || '');
      template = template.replace(/{amount}/g, templateData.amount || '');
      template = template.replace(/{message}/g, templateData.message || 'No message provided');
    } else if (templateType === 'registration') {
      template = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { color: #2c3e50; text-align: center; }
            .welcome { font-size: 18px; margin-bottom: 20px; }
            .credentials { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .important { color: #dc3545; font-weight: bold; }
            .footer { margin-top: 30px; font-size: 14px; color: #6c757d; text-align: center; }
            .button { 
              display: inline-block; 
              padding: 10px 20px; 
              background-color: #007bff; 
              color: white; 
              text-decoration: none; 
              border-radius: 5px; 
              margin-top: 15px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2 class="header">Welcome to The Fearless Movement!</h2>
            
            <p class="welcome">Dear ${templateData.firstName} ${templateData.lastName},</p>
            
            <p>Your account has been successfully created. Below are your login credentials:</p>
            
            <div class="credentials">
              <p><strong>Email:</strong> ${templateData.email}</p>
              <p><strong>Password:</strong> ${templateData.password}</p>
            </div>
            
            <p class="important">Please keep this password secure and do not share it with anyone.</p>
            
            <p>You can now log in to your account using these credentials. We recommend changing your password after your first login.</p>
            
            <div style="text-align: center;">
              <a href="YOUR_LOGIN_PAGE_URL" class="button">Login to Your Account</a>
            </div>
            
            <div class="footer">
              <p>If you didn't request this account, please contact our support team immediately.</p>
              <p>&copy; ${new Date().getFullYear()} The Fearless Movement. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else {
      // Default contact form template
      template = await fs.readFile(path.join(__dirname, 'email.html'), 'utf8');
      template = template.replace(/{name}/g, templateData.name || '');
      template = template.replace(/{email}/g, templateData.email || '');
      template = template.replace(/{phone}/g, templateData.phone || '');
      template = template.replace(/{message}/g, templateData.message || '');
    }
    
    return template;
  } catch (error) {
    console.error('Error reading template:', error);
    throw error;
  }
};

const generateTextContent = (templateData, templateType) => {
  if (templateType === 'admin-created') {
    return `
New Admin Account Created

A new admin account has been successfully created:

Username: ${templateData.username}
Account Type: ${templateData.is_super_admin ? 'Super Admin' : 'Admin'}
Created At: ${new Date().toLocaleString()}
Password: ${templateData.password}

This account now has access to the admin dashboard with ${templateData.is_super_admin ? 'full' : 'limited'} privileges.

Admin Panel URL: ${process.env.ADMIN_PANEL_URL}

If this account was created in error, please take appropriate security measures immediately.

© ${new Date().getFullYear()} The Fearless Movement. All rights reserved.
    `;
  } else if (templateType === 'user-welcome') {
    return `
Welcome to The Fearless Movement!

Dear ${templateData.username},

Your account has been successfully created. Here are your login details:

Username: ${templateData.username}
Email: ${templateData.email}
Password: ${templateData.password}

Please keep this password secure and do not share it with anyone.

You can now log in to your account using these credentials. We recommend changing your password after your first login.

Login URL: http://127.0.0.1:5501/we%20the%20fearless/login.html

If you didn't request this account, please contact our support team immediately.

© ${new Date().getFullYear()} The Fearless Movement. All rights reserved.
    `;
  } else if (templateType === 'login') {
    return `
Login Notification

A login has been detected for your admin account:

Username: ${templateData.username}
Login Time: ${templateData.loginTime}
IP Address: ${templateData.ipAddress}

If this was not you, please secure your account immediately by changing your password.
    `;
  } else if (templateType === 'ticket') {
    return `
Ticket Purchase Confirmation

Ticket Details:
Ticket Number: ${templateData.ticketNumber}
Ticket Type: ${templateData.ticketType}
Quantity: ${templateData.quantity}
Total Cost: KSh ${templateData.totalCost}

Please find your QR code in the HTML version of this email.
    `;
  } else if (templateType === 'order') {
    const itemsList = templateData.items.map(item => 
      `${item.name} x${item.quantity} - KSh ${item.price * item.quantity}`
    ).join('\n');

    return `
New Order Received

Order Details:
${itemsList}

Total Amount: KSh ${templateData.total}
Order Date: ${templateData.orderDate}
    `;
  } else if (templateType === 'donation') {
    return `
New Donation Submission

Donor Name: ${templateData.name}
Email: ${templateData.email}
Phone: ${templateData.phone}
Address: ${templateData.address}
Donor Type: ${templateData.donorType}
Payment Method: ${templateData.paymentMethod}
Amount: KES ${templateData.amount}

Message:
${templateData.message}
    `;
  } else if (templateType === 'registration') {
    return `
Welcome to The Fearless Movement!

Dear ${templateData.firstName} ${templateData.lastName},

Your account has been successfully created. Here are your login details:

Email: ${templateData.email}
Password: ${templateData.password}

Please keep this password secure and do not share it with anyone.

You can now log in to your account using these credentials. We recommend changing your password after your first login.

Login URL: YOUR_LOGIN_PAGE_URL

If you didn't request this account, please contact our support team immediately.

© ${new Date().getFullYear()} The Fearless Movement. All rights reserved.
    `;
  } else {
    return `
Contact Form Submission

Name: ${templateData.name}
Email: ${templateData.email}
Phone: ${templateData.phone}

Message:
${templateData.message}
    `;
  }
};

const sendEmail = async (to, subject, templateData, templateType = 'contact') => {
  try {
    // Convert single email to array if needed
    const recipients = Array.isArray(to) ? to : to.split(',').map(e => e.trim());

    // Validate at least one recipient
    if (!recipients.length || !recipients[0].includes('@')) {
      throw new Error('No valid recipient email provided');
    }

    const htmlContent = await getEmailTemplate(templateData, templateType);
    const textContent = generateTextContent(templateData, templateType);

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: recipients.join(', '), // Send to all recipients
      subject: subject,
      text: textContent,
      html: htmlContent,
      replyTo: templateData.email || process.env.EMAIL_USER,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to: ${recipients.join(', ')}`);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

module.exports = sendEmail;