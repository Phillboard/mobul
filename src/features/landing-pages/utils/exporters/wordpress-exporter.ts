/**
 * WordPress Plugin Exporter
 * Generates a WordPress plugin with shortcode support
 */

import JSZip from 'jszip';

export interface WordPressExportOptions {
  pluginName?: string;
  shortcodePrefix?: string;
}

export async function exportToWordPress(
  html: string,
  options: WordPressExportOptions = {}
): Promise<Blob> {
  const {
    pluginName = 'ACE Engage Landing Page',
    shortcodePrefix = 'ace',
  } = options;

  const pluginSlug = pluginName.toLowerCase().replace(/\s+/g, '-');
  const shortcodeName = `${shortcodePrefix}_landing_page`;

  // Extract CSS from HTML
  const cssMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  const css = cssMatch ? cssMatch[1] : '';

  // Extract body content
  let content = html;
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch) {
    content = bodyMatch[1].trim();
  }

  // Remove style tags from content
  content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Main plugin file
  const pluginMainFile = `<?php
/**
 * Plugin Name: ${pluginName}
 * Plugin URI: https://aceengage.com
 * Description: Landing page created with ACE Engage AI Landing Page Builder
 * Version: 1.0.0
 * Author: ACE Engage
 * Author URI: https://aceengage.com
 * License: GPL v2 or later
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

class ACE_Landing_Page_Plugin {
    
    public function __construct() {
        add_shortcode('${shortcodeName}', array($this, 'render_landing_page'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_styles'));
    }
    
    public function enqueue_styles() {
        wp_enqueue_style(
            '${pluginSlug}-styles',
            plugin_dir_url(__FILE__) . 'assets/styles.css',
            array(),
            '1.0.0'
        );
        
        // Enqueue Tailwind CSS
        wp_enqueue_script(
            'tailwindcss',
            'https://cdn.tailwindcss.com',
            array(),
            null,
            false
        );
    }
    
    public function render_landing_page($atts) {
        ob_start();
        include plugin_dir_path(__FILE__) . 'templates/landing-page.php';
        return ob_get_clean();
    }
}

new ACE_Landing_Page_Plugin();
`;

  // Template file
  const templateFile = `<?php
/**
 * Landing Page Template
 * Shortcode: [${shortcodeName}]
 */

if (!defined('ABSPATH')) {
    exit;
}
?>

<div class="ace-landing-page-wrapper">
    ${content}
</div>
`;

  // CSS file
  const cssFile = `/*
 * ACE Engage Landing Page Styles
 */

.ace-landing-page-wrapper {
    width: 100%;
}

${css}
`;

  // README file
  const readmeFile = `=== ${pluginName} ===
Contributors: aceengage
Tags: landing-page, marketing
Requires at least: 5.0
Tested up to: 6.4
Stable tag: 1.0.0
License: GPLv2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html

Landing page created with ACE Engage AI Landing Page Builder

== Description ==

This plugin adds a landing page to your WordPress site using a shortcode.

== Installation ==

1. Upload the plugin files to '/wp-content/plugins/${pluginSlug}/' directory
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Use the shortcode [${shortcodeName}] in any page or post

== Usage ==

Simply add the shortcode [${shortcodeName}] to any page or post where you want the landing page to appear.

You can also use it in your theme:
<?php echo do_shortcode('[${shortcodeName}]'); ?>

== Customization ==

To customize the landing page:
1. Edit '/templates/landing-page.php' for HTML structure
2. Edit '/assets/styles.css' for styling

== Support ==

For support, visit https://aceengage.com/support

== Changelog ==

= 1.0.0 =
* Initial release
`;

  // Installation guide
  const installGuide = `# WordPress Plugin Installation Guide

## Automatic Installation

1. Download the plugin zip file
2. Log in to your WordPress admin panel
3. Navigate to Plugins > Add New
4. Click "Upload Plugin" button at the top
5. Choose the downloaded zip file
6. Click "Install Now"
7. After installation, click "Activate Plugin"

## Manual Installation

1. Extract the zip file
2. Upload the '${pluginSlug}' folder to '/wp-content/plugins/' directory via FTP
3. Activate the plugin through the 'Plugins' menu in WordPress

## Usage

Add the following shortcode to any page or post:

\`\`\`
[${shortcodeName}]
\`\`\`

### In Theme Files

\`\`\`php
<?php echo do_shortcode('[${shortcodeName}]'); ?>
\`\`\`

### With Gutenberg

1. Add a "Shortcode" block
2. Enter: [${shortcodeName}]

## Customization

### Edit Content
Edit: \`/templates/landing-page.php\`

### Edit Styles
Edit: \`/assets/styles.css\`

### Add Custom Fields

You can extend the shortcode with custom attributes:

\`\`\`php
// In ${pluginSlug}.php
public function render_landing_page($atts) {
    $atts = shortcode_atts(array(
        'title' => 'Default Title',
        'button_text' => 'Click Here',
    ), $atts);
    
    // Use $atts['title'] and $atts['button_text'] in your template
}
\`\`\`

## Troubleshooting

### Styles Not Loading
1. Clear WordPress cache
2. Clear browser cache
3. Check if Tailwind CSS is loading (view page source)

### Shortcode Not Working
1. Ensure plugin is activated
2. Check for conflicting plugins
3. Try re-saving your page/post

## Support

For issues or questions:
- Email: support@aceengage.com
- Documentation: https://aceengage.com/docs
`;

  // Create zip structure
  const zip = new JSZip();
  const pluginFolder = zip.folder(pluginSlug)!;
  
  pluginFolder.file(`${pluginSlug}.php`, pluginMainFile);
  pluginFolder.file('readme.txt', readmeFile);
  pluginFolder.file('INSTALL.md', installGuide);
  
  const templatesFolder = pluginFolder.folder('templates')!;
  templatesFolder.file('landing-page.php', templateFile);
  
  const assetsFolder = pluginFolder.folder('assets')!;
  assetsFolder.file('styles.css', cssFile);

  const blob = await zip.generateAsync({ type: 'blob' });
  return blob;
}

