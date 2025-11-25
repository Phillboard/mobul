import { EditorConfig } from "grapesjs";

export const mailGrapesJSConfig: Partial<EditorConfig> = {
  height: "100%",
  width: "100%",
  storageManager: false,
  canvas: {
    styles: [
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
    ],
  },
  deviceManager: {
    devices: [
      {
        id: "4x6",
        name: "4×6 Postcard",
        width: "1200px",
        height: "1800px",
      },
      {
        id: "6x9",
        name: "6×9 Postcard",
        width: "1800px",
        height: "2700px",
      },
      {
        id: "6x11",
        name: "6×11 Postcard",
        width: "1800px",
        height: "3300px",
      },
      {
        id: "letter",
        name: "Letter (8.5×11)",
        width: "2550px",
        height: "3300px",
      },
    ],
  },
  blockManager: {
    appendTo: ".blocks-container",
    blocks: [
      {
        id: "mail-hero",
        label: "Mail Hero",
        category: "Mail Components",
        content: `
          <div style="padding: 40px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
            <h1 style="font-size: 48px; margin: 0 0 20px 0; font-weight: bold;">Your Headline Here</h1>
            <p style="font-size: 24px; margin: 0;">Compelling subheadline that drives action</p>
          </div>
        `,
        media: `<svg viewBox="0 0 24 24" width="48" height="48"><rect x="2" y="3" width="20" height="18" rx="2" fill="currentColor"/></svg>`,
      },
      {
        id: "offer-box",
        label: "Offer Box",
        category: "Mail Components",
        content: `
          <div style="border: 4px dashed #e53e3e; padding: 30px; margin: 20px; text-align: center; background: #fef5e7;">
            <h2 style="color: #e53e3e; font-size: 36px; margin: 0 0 10px 0;">50% OFF</h2>
            <p style="font-size: 18px; margin: 0;">Limited Time Offer</p>
          </div>
        `,
        media: `<svg viewBox="0 0 24 24" width="48" height="48"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="4 4"/></svg>`,
      },
      {
        id: "coupon-code",
        label: "Coupon Code",
        category: "Mail Components",
        content: `
          <div style="border: 2px solid #3b82f6; padding: 20px; margin: 20px; background: white; text-align: center;">
            <p style="font-size: 14px; margin: 0 0 10px 0; color: #6b7280;">Use Code:</p>
            <div style="background: #eff6ff; padding: 15px; border-radius: 8px; font-family: monospace; font-size: 28px; font-weight: bold; color: #1e40af; letter-spacing: 2px;">
              SAVE20
            </div>
          </div>
        `,
        media: `<svg viewBox="0 0 24 24" width="48" height="48"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" stroke-width="2" fill="none"/></svg>`,
      },
      {
        id: "qr-section",
        label: "QR Code Section",
        category: "Mail Components",
        content: `
          <div style="text-align: center; padding: 30px;">
            <div style="display: inline-block; padding: 20px; background: white; border: 1px solid #e5e7eb; border-radius: 12px;">
              <div style="width: 200px; height: 200px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; border-radius: 8px;">
                <p style="margin: 0; color: #9ca3af; font-size: 14px;">QR Code<br/>Placeholder</p>
              </div>
              <p style="margin: 10px 0 0 0; font-size: 14px; color: #6b7280;">Scan to learn more</p>
            </div>
          </div>
        `,
        media: `<svg viewBox="0 0 24 24" width="48" height="48"><rect x="3" y="3" width="8" height="8" fill="currentColor"/><rect x="13" y="3" width="8" height="8" fill="currentColor"/><rect x="3" y="13" width="8" height="8" fill="currentColor"/></svg>`,
      },
      {
        id: "contact-cta",
        label: "Contact CTA",
        category: "Mail Components",
        content: `
          <div style="background: #1f2937; color: white; padding: 40px; text-align: center;">
            <h3 style="font-size: 32px; margin: 0 0 20px 0;">Ready to Get Started?</h3>
            <div style="display: inline-block; background: #3b82f6; color: white; padding: 15px 40px; border-radius: 8px; font-size: 20px; font-weight: bold;">
              Call: (555) 123-4567
            </div>
            <p style="margin: 20px 0 0 0; font-size: 16px; opacity: 0.8;">Or visit: www.yourwebsite.com</p>
          </div>
        `,
        media: `<svg viewBox="0 0 24 24" width="48" height="48"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" stroke="currentColor" stroke-width="2" fill="none"/></svg>`,
      },
      {
        id: "two-column",
        label: "Two Column Layout",
        category: "Mail Components",
        content: `
          <div style="display: flex; gap: 20px; padding: 20px;">
            <div style="flex: 1; padding: 20px; background: #f9fafb; border-radius: 8px;">
              <h4 style="margin: 0 0 10px 0;">Column 1</h4>
              <p style="margin: 0; color: #6b7280;">Add your content here</p>
            </div>
            <div style="flex: 1; padding: 20px; background: #f9fafb; border-radius: 8px;">
              <h4 style="margin: 0 0 10px 0;">Column 2</h4>
              <p style="margin: 0; color: #6b7280;">Add your content here</p>
            </div>
          </div>
        `,
        media: `<svg viewBox="0 0 24 24" width="48" height="48"><rect x="3" y="3" width="8" height="18" fill="currentColor"/><rect x="13" y="3" width="8" height="18" fill="currentColor"/></svg>`,
      },
    ],
  },
  styleManager: {
    sectors: [
      {
        name: "General",
        properties: [
          "display",
          "position",
          "top",
          "right",
          "bottom",
          "left",
          "width",
          "height",
        ],
      },
      {
        name: "Typography",
        properties: [
          "font-family",
          "font-size",
          "font-weight",
          "letter-spacing",
          "color",
          "line-height",
          "text-align",
          "text-shadow",
        ],
      },
      {
        name: "Decorations",
        properties: [
          "background-color",
          "border",
          "border-radius",
          "box-shadow",
          "opacity",
        ],
      },
      {
        name: "Extra",
        properties: ["transition", "transform"],
      },
    ],
  },
};
