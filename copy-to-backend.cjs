const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'dist');
const destDir = path.join(__dirname, '..', 'pos-backend', 'public');

function copyFolderSync(from, to) {
  if (!fs.existsSync(to)) {
    fs.mkdirSync(to, { recursive: true });
  }
  
  fs.readdirSync(from).forEach(element => {
    const srcElement = path.join(from, element);
    const destElement = path.join(to, element);
    
    if (fs.lstatSync(srcElement).isDirectory()) {
      copyFolderSync(srcElement, destElement);
    } else {
      fs.copyFileSync(srcElement, destElement);
    }
  });
}

try {
  console.log('Cleaning up old public directory in backend...');
  if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true, force: true });
  }
  
  console.log('Copying build assets to backend public folder...');
  copyFolderSync(srcDir, destDir);
  console.log('==================================================');
  console.log('Offline UI Build Assets successfully copied to backend!');
  console.log('==================================================');
} catch (err) {
  console.error('Failed to copy assets:', err);
}
