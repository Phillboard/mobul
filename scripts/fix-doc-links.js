const fs = require('fs');
const path = require('path');

const docsDir = path.join(__dirname, 'public', 'docs');

function fixLinksInDirectory(dir) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      fixLinksInDirectory(fullPath);
    } else if (item.endsWith('.md')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const original = content;
      content = content.replace(/\/admin\/docs\//g, '/docs/');
      
      if (content !== original) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Fixed: ${fullPath}`);
      }
    }
  }
}

console.log('Fixing all /admin/docs links...');
fixLinksInDirectory(docsDir);
console.log('Done!');
