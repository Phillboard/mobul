const fs = require('fs');
const path = require('path');

// Component import replacements
const replacements = [
  // Feature-specific components
  ['@/components/gift-cards/', '@/features/gift-cards/components/'],
  ['@/components/campaigns/', '@/features/campaigns/components/'],
  ['@/components/contacts/', '@/features/contacts/components/'],
  ['@/components/call-center/', '@/features/call-center/components/'],
  ['@/components/ace-forms/', '@/features/ace-forms/components/'],
  ['@/components/activities/', '@/features/activities/components/'],
  ['@/components/admin/', '@/features/admin/components/'],
  ['@/components/agency/', '@/features/agency/components/'],
  ['@/components/agent/', '@/features/agent/components/'],
  ['@/components/analytics/', '@/features/analytics/components/'],
  ['@/components/audiences/', '@/features/audiences/components/'],
  ['@/components/dashboard/', '@/features/dashboard/components/'],
  ['@/components/documentation/', '@/features/documentation/components/'],
  ['@/components/email/', '@/features/email/components/'],
  ['@/components/landing-pages/', '@/features/landing-pages/components/'],
  ['@/components/mail/', '@/features/mail-designer/components/'],
  ['@/components/monitoring/', '@/features/admin/components/monitoring/'],
  ['@/components/onboarding/', '@/features/onboarding/components/'],
  ['@/components/settings/', '@/features/settings/components/'],
  ['@/components/api/', '@/features/settings/components/api/'],
  
  // Shared components
  ['@/components/ui/', '@/shared/components/ui/'],
  ['@/components/shared/', '@/shared/components/'],
  ['@/components/layout/', '@/shared/components/layout/'],
  ['@/components/ErrorBoundaries/', '@/shared/components/ErrorBoundaries/'],
  ['@/components/ErrorBoundary', '@/shared/components/ErrorBoundary'],
  ['@/components/NavLink', '@/shared/components/NavLink'],
  ['@/components/CookieConsent', '@/shared/components/CookieConsent'],
  ['@/components/DrPhillipChat', '@/features/dashboard/components/DrPhillipChat'],
  ['@/components/DrPhillipChatWrapper', '@/features/dashboard/components/DrPhillipChatWrapper'],
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
    // Escape special regex characters
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

