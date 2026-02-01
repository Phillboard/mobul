/**
 * EmailLayout Component
 * 
 * Consistent branded wrapper for all email templates
 * Provides header, footer, and styling structure
 */

interface EmailLayoutProps {
  children: React.ReactNode;
  preheader?: string;
  clientName?: string;
  logoUrl?: string;
}

export function EmailLayout({ children, preheader, clientName = "Mobul", logoUrl }: EmailLayoutProps) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${clientName}</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background-color: #f5f5f5;
        }
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
        }
        .email-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 40px 20px;
          text-align: center;
        }
        .email-logo {
          max-width: 150px;
          margin-bottom: 20px;
        }
        .email-title {
          color: #ffffff;
          font-size: 28px;
          font-weight: bold;
          margin: 0;
        }
        .email-body {
          padding: 40px 30px;
          color: #333333;
          line-height: 1.6;
        }
        .email-footer {
          background-color: #f8f9fa;
          padding: 30px;
          text-align: center;
          border-top: 1px solid #e9ecef;
        }
        .footer-text {
          color: #6c757d;
          font-size: 14px;
          margin: 5px 0;
        }
        .button {
          display: inline-block;
          padding: 14px 28px;
          background-color: #667eea;
          color: #ffffff !important;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          margin: 20px 0;
        }
        .card {
          background-color: #f8f9fa;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .code-display {
          background-color: #e9ecef;
          border: 2px dashed #667eea;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          font-size: 24px;
          font-weight: bold;
          color: #667eea;
          letter-spacing: 2px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      ${preheader ? `<div style="display: none; max-height: 0; overflow: hidden;">${preheader}</div>` : ''}
      
      <div class="email-container">
        <div class="email-header">
          ${logoUrl ? `<img src="${logoUrl}" alt="${clientName}" class="email-logo" />` : ''}
          <h1 class="email-title">${clientName}</h1>
        </div>
        
        <div class="email-body">
          ${children}
        </div>
        
        <div class="email-footer">
          <p class="footer-text">© ${new Date().getFullYear()} ${clientName}. All rights reserved.</p>
          <p class="footer-text">This is an automated message. Please do not reply directly to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function renderEmailLayout(props: EmailLayoutProps): string {
  return EmailLayout(props);
}

