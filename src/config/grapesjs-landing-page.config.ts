import { coreGrapesJSConfig } from './grapesjs-core.config';
import {
  tableComponent,
  swiperComponent,
  accordionComponent,
  youtubeAssetProvider,
  canvasGridMode,
} from '@grapesjs/studio-sdk-plugins';

export const landingPageGrapesJSConfig = {
  ...coreGrapesJSConfig,
  
  // Landing page specific plugins
  plugins: [
    ...coreGrapesJSConfig.plugins,
    tableComponent,
    swiperComponent,
    accordionComponent,
    youtubeAssetProvider,
    canvasGridMode,
  ],
  
  // Canvas settings for web design
  canvas: {
    styles: [
      'https://cdn.jsdelivr.net/npm/tailwindcss@3/dist/tailwind.min.css',
    ],
    scripts: [],
  },
  
  // Custom blocks for landing pages
  blockManager: {
    blocks: [
      {
        id: 'hero-gift-card',
        label: 'Gift Card Hero',
        category: 'Hero Sections',
        media: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 6h-2.18c.11-.31.18-.65.18-1a2.996 2.996 0 0 0-5.5-1.65l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z"/></svg>',
        content: `
          <section style="min-height: 600px; display: flex; align-items: center; padding: 80px 20px; background: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)) 100%);">
            <div style="max-width: 1200px; margin: 0 auto; text-align: center; color: white;">
              <h1 style="font-size: 4rem; font-weight: 800; margin-bottom: 1.5rem; color: hsl(var(--primary-foreground));">
                Congratulations! You've Earned a <span style="color: hsl(var(--accent));">$25 Amazon Gift Card</span>
              </h1>
              <p style="font-size: 1.5rem; margin-bottom: 2rem; opacity: 0.9;">
                Thank you for calling in! Redeem your reward below.
              </p>
              <form id="redemption-form" style="max-width: 500px; margin: 0 auto;">
                <input 
                  id="gift-card-code" 
                  type="text" 
                  placeholder="Enter your unique code"
                  style="width: 100%; padding: 1rem; font-size: 1.125rem; border-radius: 8px; border: none; margin-bottom: 1rem; color: hsl(var(--foreground)); background: hsl(var(--background));"
                />
                <button 
                  id="submit-button"
                  type="submit"
                  style="width: 100%; padding: 1rem; font-size: 1.125rem; font-weight: 600; background: hsl(var(--accent)); color: hsl(var(--accent-foreground)); border: none; border-radius: 8px; cursor: pointer;"
                >
                  Redeem My Gift Card
                </button>
              </form>
            </div>
          </section>
        `,
      },
      {
        id: 'features-3col',
        label: '3 Column Features',
        category: 'Features',
        media: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>',
        content: `
          <section style="padding: 80px 20px; background: hsl(var(--background));">
            <div style="max-width: 1200px; margin: 0 auto;">
              <h2 style="text-align: center; font-size: 3rem; margin-bottom: 3rem; color: hsl(var(--foreground));">Why Choose Us</h2>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem;">
                <div style="text-align: center; padding: 2rem;">
                  <div style="width: 80px; height: 80px; background: hsl(var(--primary)); border-radius: 50%; margin: 0 auto 1.5rem; display: flex; align-items: center; justify-content: center; color: hsl(var(--primary-foreground)); font-size: 2rem;">⚡</div>
                  <h3 style="font-size: 1.5rem; margin-bottom: 1rem; color: hsl(var(--foreground));">Fast Delivery</h3>
                  <p style="color: hsl(var(--muted-foreground));">Get your gift card instantly. No waiting, no hassle.</p>
                </div>
                <div style="text-align: center; padding: 2rem;">
                  <div style="width: 80px; height: 80px; background: hsl(var(--accent)); border-radius: 50%; margin: 0 auto 1.5rem; display: flex; align-items: center; justify-content: center; color: hsl(var(--accent-foreground)); font-size: 2rem;">🔒</div>
                  <h3 style="font-size: 1.5rem; margin-bottom: 1rem; color: hsl(var(--foreground));">100% Secure</h3>
                  <p style="color: hsl(var(--muted-foreground));">Your information is always protected and encrypted.</p>
                </div>
                <div style="text-align: center; padding: 2rem;">
                  <div style="width: 80px; height: 80px; background: hsl(var(--secondary)); border-radius: 50%; margin: 0 auto 1.5rem; display: flex; align-items: center; justify-content: center; color: hsl(var(--secondary-foreground)); font-size: 2rem;">💯</div>
                  <h3 style="font-size: 1.5rem; margin-bottom: 1rem; color: hsl(var(--foreground));">Guaranteed Value</h3>
                  <p style="color: hsl(var(--muted-foreground));">Full value gift cards from trusted brands.</p>
                </div>
              </div>
            </div>
          </section>
        `,
      },
      {
        id: 'cta-centered',
        label: 'Centered CTA',
        category: 'Call to Action',
        media: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM5 10h5v3H5zm8 0h6v3h-6z"/></svg>',
        content: `
          <section style="padding: 100px 20px; background: hsl(var(--primary)); text-align: center; color: hsl(var(--primary-foreground));">
            <div style="max-width: 800px; margin: 0 auto;">
              <h2 style="font-size: 3rem; font-weight: 700; margin-bottom: 1.5rem;">Ready to Claim Your Reward?</h2>
              <p style="font-size: 1.25rem; margin-bottom: 2rem; opacity: 0.9;">Join thousands of satisfied customers who have redeemed their gift cards.</p>
              <button style="padding: 1.25rem 3rem; background: hsl(var(--accent)); color: hsl(var(--accent-foreground)); border: none; border-radius: 8px; font-size: 1.125rem; font-weight: 600; cursor: pointer; box-shadow: 0 10px 15px rgba(0,0,0,0.2);">Redeem Now</button>
            </div>
          </section>
        `,
      },
      {
        id: 'footer-simple',
        label: 'Simple Footer',
        category: 'Footers',
        media: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 22h16V8H4v14zM2 6h20V4H2v2z"/></svg>',
        content: `
          <footer style="padding: 40px 20px; background: hsl(var(--secondary)); color: hsl(var(--secondary-foreground)); text-align: center;">
            <div style="max-width: 1200px; margin: 0 auto;">
              <div style="display: flex; justify-content: center; gap: 2rem; margin-bottom: 2rem; flex-wrap: wrap;">
                <a href="#" style="color: hsl(var(--muted-foreground)); text-decoration: none;">Privacy Policy</a>
                <a href="#" style="color: hsl(var(--muted-foreground)); text-decoration: none;">Terms of Service</a>
                <a href="#" style="color: hsl(var(--muted-foreground)); text-decoration: none;">Contact Us</a>
              </div>
              <p style="color: hsl(var(--muted-foreground)); font-size: 0.875rem;">© 2025 Your Company. All rights reserved.</p>
            </div>
          </footer>
        `,
      },
    ],
  },
  
  // Style manager for web-specific properties
  styleManager: {
    sectors: [
      {
        name: 'Layout',
        properties: ['display', 'flex-direction', 'justify-content', 'align-items', 'gap', 'padding', 'margin'],
      },
      {
        name: 'Typography',
        properties: ['font-family', 'font-size', 'font-weight', 'line-height', 'text-align', 'color'],
      },
      {
        name: 'Decoration',
        properties: ['background-color', 'background-image', 'border', 'border-radius', 'box-shadow'],
      },
      {
        name: 'Responsive',
        properties: ['width', 'max-width', 'min-width', 'height', 'max-height', 'min-height'],
      },
    ],
  },
};
