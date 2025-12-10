const fs = require('fs');
const path = require('path');

// Lib import replacements
const replacements = [
  // Services to core
  ['@/lib/ai/', '@/core/services/ai/'],
  ['@/lib/services/', '@/core/services/'],
  ['@/lib/system/', '@/core/services/system/'],
  ['@/lib/performance/', '@/core/services/performance/'],
  ['@/lib/web/', '@/core/services/web/'],
  ['@/lib/auth/', '@/core/auth/'],
  
  // Feature-specific
  ['@/lib/campaign/', '@/features/campaigns/utils/'],
  ['@/lib/conditions/', '@/features/campaigns/utils/conditions/'],
  ['@/lib/gift-cards/', '@/features/gift-cards/lib/'],
  ['@/lib/tillo/', '@/features/gift-cards/lib/tillo/'],
  ['@/lib/landing-pages/', '@/features/landing-pages/utils/'],
  ['@/lib/templates/', '@/features/mail-designer/templates/'],
  ['@/lib/export/', '@/features/contacts/utils/export/'],
  ['@/lib/demo/', '@/features/admin/demo/'],
  
  // Shared utils
  ['@/lib/utils/', '@/shared/utils/'],
  ['@/lib/validation/', '@/shared/utils/validation/'],
  ['@/lib/config/', '@/core/config/'],
  
  // Standalone files
  ['@/lib/errorLogger', '@/core/services/errorLogger'],
  ['@/lib/request-tracer', '@/core/services/request-tracer'],
  ['@/lib/terminology', '@/shared/utils/terminology'],
  ['@/lib/demo-data-generators', '@/features/admin/demo/demo-data-generators'],
];

function walk(dir) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory() && !filePath.includes('node_modules')) {
        results = results.concat(walk(filePath));
      } else if (/\.(ts|tsx)$/.test(file)) {
        results.push(filePath);
      }
    });
  } catch (e) {}
  return results;
}

let totalCount = 0;
let filesModified = 0;

walk('src').forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let modified = false;
  
  replacements.forEach(([from, to]) => {
    const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'g');
    if (regex.test(content)) {
      content = content.replace(regex, to);
      modified = true;
      totalCount++;
    }
  });
  
  if (modified) {
    fs.writeFileSync(file, content);
    filesModified++;
  }
});

console.log(`Replacements made: ${totalCount}`);
console.log(`Files modified: ${filesModified}`);

