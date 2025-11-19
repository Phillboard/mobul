import { coreGrapesJSConfig } from './grapesjs-core.config';

export const mailerGrapesJSConfig = {
  ...coreGrapesJSConfig,
  
  // Mailer-specific plugins (minimal - print doesn't need interactive features)
  plugins: coreGrapesJSConfig.plugins,
  
  // Canvas settings for print design
  canvas: {
    styles: [],
    scripts: [],
  },
  
  // Print-specific device manager
  deviceManager: {
    devices: [
      { id: '4x6', name: '4×6 Postcard', width: '1800px', height: '1200px' },
      { id: '6x9', name: '6×9 Postcard', width: '2700px', height: '1800px' },
      { id: '6x11', name: '6×11 Postcard', width: '3300px', height: '1800px' },
    ],
  },
  
  // Custom blocks for mailers
  blockManager: {
    blocks: [
      {
        id: 'headline-large',
        label: 'Large Headline',
        category: 'Headlines',
        media: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 4v3h5.5v12h3V7H19V4z"/></svg>',
        content: `
          <div data-gjs-type="text" style="font-size: 72px; font-weight: 800; line-height: 1.1; color: #1f2937; text-align: center; padding: 40px;">
            Your Attention-Grabbing Headline
          </div>
        `,
      },
      {
        id: 'offer-badge',
        label: 'Offer Badge',
        category: 'Offers',
        media: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 12c0-1.1.9-2 2-2V6c0-1.1-.9-2-2-2H4c-1.1 0-1.99.9-1.99 2v4c1.1 0 1.99.9 1.99 2s-.89 2-2 2v4c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-4c-1.1 0-2-.9-2-2zm-4.42 4.8L12 14.5l-3.58 2.3 1.08-4.12-3.29-2.69 4.24-.25L12 5.8l1.54 3.95 4.24.25-3.29 2.69 1.09 4.11z"/></svg>',
        content: `
          <div style="display: inline-block; background: #ef4444; color: white; padding: 30px 60px; border-radius: 20px; transform: rotate(-5deg); box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
            <div style="font-size: 36px; font-weight: 700; line-height: 1.2;">
              <div style="font-size: 80px; font-weight: 900;">50% OFF</div>
              <div style="font-size: 28px;">Limited Time Only!</div>
            </div>
          </div>
        `,
      },
      {
        id: 'qr-code-block',
        label: 'QR Code',
        category: 'Call to Action',
        media: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 11h8V3H3v8zm2-6h4v4H5V5zM3 21h8v-8H3v8zm2-6h4v4H5v-4zM13 3v8h8V3h-8zm6 6h-4V5h4v4zM13 13h2v2h-2zM15 15h2v2h-2zM13 17h2v2h-2zM15 19h2v2h-2zM17 17h2v2h-2zM17 13h2v2h-2zM19 15h2v2h-2z"/></svg>',
        content: `
          <div style="text-align: center; padding: 30px;">
            <div style="width: 300px; height: 300px; background: white; border: 4px solid #1f2937; display: inline-block; margin-bottom: 20px;">
              <img src="/placeholder.svg" alt="QR Code" style="width: 100%; height: 100%;" data-gjs-type="qr-code" />
            </div>
            <p style="font-size: 24px; color: #1f2937; font-weight: 600;">Scan to Learn More!</p>
          </div>
        `,
      },
      {
        id: 'cta-box',
        label: 'CTA Box',
        category: 'Call to Action',
        media: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>',
        content: `
          <div style="background: #8b5cf6; color: white; padding: 50px; text-align: center; border-radius: 12px; box-shadow: 0 10px 40px rgba(139, 92, 246, 0.4);">
            <div style="font-size: 48px; font-weight: 800; margin-bottom: 20px;">Call Now for Free Estimate!</div>
            <div style="font-size: 64px; font-weight: 900; letter-spacing: 2px;">(555) 123-4567</div>
          </div>
        `,
      },
      {
        id: 'body-text',
        label: 'Body Text',
        category: 'Text',
        media: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>',
        content: `
          <p data-gjs-type="text" style="font-size: 24px; line-height: 1.6; color: #374151; padding: 30px;">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
          </p>
        `,
      },
    ],
  },
  
  // Style manager for print-specific properties
  styleManager: {
    sectors: [
      {
        name: 'Print Layout',
        properties: ['position', 'top', 'left', 'width', 'height', 'z-index'],
      },
      {
        name: 'Print Typography',
        properties: ['font-family', 'font-size', 'font-weight', 'line-height', 'text-align', 'color'],
      },
      {
        name: 'Print Decoration',
        properties: ['background-color', 'background-image', 'border', 'border-radius', 'box-shadow', 'opacity'],
      },
    ],
  },
};
