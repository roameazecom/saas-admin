const fs = require('fs');
const path = require('path');

const directoryPaths = [
  path.join(__dirname, 'src/pages'),
  path.join(__dirname, 'src/components')
];

const replacements = [
  // Backgrounds
  { regex: /bg-white\/(\d+)/g, replacement: 'bg-surface-100/$1' },
  { regex: /bg-white\b/g, replacement: 'bg-surface-100' },
  { regex: /bg-slate-50\b/g, replacement: 'bg-surface-100' },
  { regex: /bg-surface-50\/80/g, replacement: 'bg-surface-100/80' },
  
  // Specific Component Fixes (Active tabs that were dark but now need to be brand to be visible)
  { regex: /bg-surface-800 text-white/g, replacement: 'bg-brand-600 text-white' },
  { regex: /text-surface-800 text-white/g, replacement: 'text-brand-600' }, // fix any oddities
  
  // Accents (Light backgrounds for accents become translucent dark accents)
  { regex: /bg-brand-50\b/g, replacement: 'bg-brand-500/20' },
  { regex: /bg-brand-100\b/g, replacement: 'bg-brand-500/30' },
  { regex: /bg-amber-50\b/g, replacement: 'bg-amber-500/20' },
  { regex: /bg-amber-100\b/g, replacement: 'bg-amber-500/30' },
  { regex: /bg-emerald-50\b/g, replacement: 'bg-emerald-500/20' },
  { regex: /bg-emerald-100\b/g, replacement: 'bg-emerald-500/30' },
  { regex: /bg-rose-50\b/g, replacement: 'bg-rose-500/20' },
  { regex: /bg-rose-100\b/g, replacement: 'bg-rose-500/30' },
  { regex: /bg-indigo-50\b/g, replacement: 'bg-indigo-500/20' },
  { regex: /bg-blue-50\b/g, replacement: 'bg-blue-500/20' },
  
  // Specific gradients
  { regex: /from-brand-50 to-indigo-50/g, replacement: 'from-brand-500/20 to-indigo-500/20' },
  
  // Borders
  { regex: /border-slate-100/g, replacement: 'border-surface-200' },
  { regex: /border-slate-200/g, replacement: 'border-surface-200' },
  
  // Text colors that might be hardcoded to slate
  { regex: /text-slate-500/g, replacement: 'text-surface-400' },
  { regex: /text-slate-600/g, replacement: 'text-surface-300' },
  { regex: /text-slate-800/g, replacement: 'text-surface-900' },
  { regex: /text-slate-900/g, replacement: 'text-surface-900' }
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  
  for (const { regex, replacement } of replacements) {
    content = content.replace(regex, replacement);
  }
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
}

function processDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  const files = fs.readdirSync(dirPath);
  
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      processFile(fullPath);
    }
  }
}

directoryPaths.forEach(processDirectory);
console.log('Migration complete.');
