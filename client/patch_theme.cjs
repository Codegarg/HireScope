const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      if (!dirFile.includes('node_modules') && !dirFile.includes('dist')) {
        filelist = walkSync(dirFile, filelist);
      }
    } else {
      if (dirFile.endsWith('.jsx') || dirFile.endsWith('.js') || dirFile.endsWith('.css')) {
        filelist.push(dirFile);
      }
    }
  });
  return filelist;
};

const files = walkSync(path.join(__dirname, 'src'));

const replacements = [
  { regex: /'Outfit'/g, replacement: "'Space Grotesk'" },
  { regex: /rgba\(124,\s*58,\s*237/g, replacement: "rgba(34,192,142" },
  { regex: /rgba\(79,\s*70,\s*229/g, replacement: "rgba(46,155,214" },
  { regex: /rgba\(236,\s*72,\s*153/g, replacement: "rgba(46,155,214" },
  { regex: /borderRadius:\s*'9999px'/g, replacement: "borderRadius: 'var(--radius-md)'" },
  { regex: /borderRadius:\s*"9999px"/g, replacement: "borderRadius: 'var(--radius-md)'" },
  { regex: /#7c3aed/gi, replacement: "#22C08E" },
  { regex: /#4f46e5/gi, replacement: "#2E9BD6" },
  { regex: /#a78bfa/gi, replacement: "#4CDBA8" },
  { regex: /#ec4899/gi, replacement: "#2E9BD6" }
];

let filesModified = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  replacements.forEach(({ regex, replacement }) => {
    content = content.replace(regex, replacement);
  });

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
    filesModified++;
  }
});

console.log(`Done! Modified ${filesModified} files.`);
