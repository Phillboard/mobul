/**
 * React Component Exporter
 * Converts HTML to JSX and creates React component
 */

import JSZip from 'jszip';

export interface ReactExportOptions {
  componentName?: string;
  typescript?: boolean;
  cssModules?: boolean;
}

export async function exportToReact(
  html: string,
  options: ReactExportOptions = {}
): Promise<Blob> {
  const {
    componentName = 'LandingPage',
    typescript = true,
    cssModules = false,
  } = options;

  // Extract body content (remove html, head, body tags)
  let content = html;
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch) {
    content = bodyMatch[1].trim();
  }

  // Convert HTML attributes to JSX
  let jsxContent = convertToJSX(content);

  // Create component file
  const componentExt = typescript ? 'tsx' : 'jsx';
  const componentCode = typescript
    ? generateTypeScriptComponent(componentName, jsxContent, cssModules)
    : generateJavaScriptComponent(componentName, jsxContent, cssModules);

  // Create package.json
  const packageJson = {
    name: componentName.toLowerCase(),
    version: '1.0.0',
    description: 'Landing page component exported from Mobul',
    main: `src/${componentName}.${componentExt}`,
    scripts: {
      dev: 'vite',
      build: 'vite build',
      preview: 'vite preview',
    },
    dependencies: {
      react: '^18.2.0',
      'react-dom': '^18.2.0',
    },
    devDependencies: {
      '@vitejs/plugin-react': '^4.2.0',
      vite: '^5.0.0',
      ...(typescript
        ? {
            typescript: '^5.2.0',
            '@types/react': '^18.2.0',
            '@types/react-dom': '^18.2.0',
          }
        : {}),
    },
  };

  // Create README
  const readme = `# ${componentName} - React Component

This is a React component exported from Mobul.

## Installation

\`\`\`bash
npm install
\`\`\`

## Development

\`\`\`bash
npm run dev
\`\`\`

## Build

\`\`\`bash
npm run build
\`\`\`

## Usage

\`\`\`${typescript ? 'tsx' : 'jsx'}
import ${componentName} from './src/${componentName}';

function App() {
  return <${componentName} />;
}
\`\`\`

## Tailwind CSS

This component uses Tailwind CSS. Make sure to include the Tailwind CDN or configure Tailwind in your project.

## Customization

Edit \`src/${componentName}.${componentExt}\` to customize the component.
`;

  // Create App file for testing
  const appCode = typescript
    ? `import React from 'react';
import ${componentName} from './${componentName}';

function App() {
  return <${componentName} />;
}

export default App;`
    : `import React from 'react';
import ${componentName} from './${componentName}';

function App() {
  return <${componentName} />;
}

export default App;`;

  // Create main entry
  const mainCode = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './src/App.${componentExt}';

ReactDOM.createRoot(document.getElementById('root')${typescript ? '!' : ''}).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`;

  // Create index.html
  const indexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${componentName}</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/main.${componentExt}"></script>
  </body>
</html>`;

  // Create vite config
  const viteConfig = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});`;

  // Create zip file
  const zip = new JSZip();
  
  zip.file(`src/${componentName}.${componentExt}`, componentCode);
  zip.file(`src/App.${componentExt}`, appCode);
  zip.file(`main.${componentExt}`, mainCode);
  zip.file('package.json', JSON.stringify(packageJson, null, 2));
  zip.file('README.md', readme);
  zip.file('index.html', indexHtml);
  zip.file('vite.config.js', viteConfig);

  if (typescript) {
    const tsConfig = {
      compilerOptions: {
        target: 'ES2020',
        useDefineForClassFields: true,
        lib: ['ES2020', 'DOM', 'DOM.Iterable'],
        module: 'ESNext',
        skipLibCheck: true,
        moduleResolution: 'bundler',
        allowImportingTsExtensions: true,
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        jsx: 'react-jsx',
        strict: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        noFallthroughCasesInSwitch: true,
      },
      include: ['src'],
      references: [{ path: './tsconfig.node.json' }],
    };
    zip.file('tsconfig.json', JSON.stringify(tsConfig, null, 2));
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  return blob;
}

/**
 * Convert HTML to JSX
 */
function convertToJSX(html: string): string {
  let jsx = html;

  // Convert class to className
  jsx = jsx.replace(/\sclass=/g, ' className=');

  // Convert style strings to objects
  jsx = jsx.replace(/style="([^"]*)"/g, (match, styleString) => {
    const styles = styleString
      .split(';')
      .filter((s: string) => s.trim())
      .map((s: string) => {
        const [prop, value] = s.split(':').map((p: string) => p.trim());
        const camelProp = prop.replace(/-([a-z])/g, (g: string) => g[1].toUpperCase());
        return `${camelProp}: '${value}'`;
      })
      .join(', ');
    return `style={{${styles}}}`;
  });

  // Convert self-closing tags
  jsx = jsx.replace(/<(img|input|br|hr)([^>]*)>/g, '<$1$2 />');

  // Convert for to htmlFor
  jsx = jsx.replace(/\sfor=/g, ' htmlFor=');

  return jsx;
}

/**
 * Generate TypeScript component
 */
function generateTypeScriptComponent(name: string, jsx: string, cssModules: boolean): string {
  return `import React from 'react';
${cssModules ? `import styles from './${name}.module.css';` : ''}

interface ${name}Props {
  // Add your props here
}

const ${name}: React.FC<${name}Props> = (props) => {
  return (
    <>
      ${jsx}
    </>
  );
};

export default ${name};`;
}

/**
 * Generate JavaScript component
 */
function generateJavaScriptComponent(name: string, jsx: string, cssModules: boolean): string {
  return `import React from 'react';
${cssModules ? `import styles from './${name}.module.css';` : ''}

const ${name} = (props) => {
  return (
    <>
      ${jsx}
    </>
  );
};

export default ${name};`;
}

