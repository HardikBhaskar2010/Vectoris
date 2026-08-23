const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const stitchDir = path.join(__dirname, 'designs', 'stitch');

const files = [
  { html: '01_Dashboard_Dark_Theme.html', png: '01_Dashboard_Dark_Theme.png', width: 1920, height: 1080 },
  { html: '02_Dashboard_Light_Theme.html', png: '02_Dashboard_Light_Theme.png', width: 1920, height: 1080 },
  { html: '03_Authentication_SignUp.html', png: '03_Authentication_SignUp.png', width: 1920, height: 1080 },
  { html: '04_Drawing_Takeoff_Workspace.html', png: '04_Drawing_Takeoff_Workspace.png', width: 1920, height: 1080 },
  { html: '05_Document_Processing_Pipeline.html', png: '05_Document_Processing_Pipeline.png', width: 1920, height: 1080 },
  { html: '06_AI_Session_Agent_Chat.html', png: '06_AI_Session_Agent_Chat.png', width: 1920, height: 1080 },
  { html: '07_Projects_Library_Create_Modal.html', png: '07_Projects_Library_Create_Modal.png', width: 1920, height: 1080 },
  { html: '08_Takeoff_Review_BOQ_Export.html', png: '08_Takeoff_Review_BOQ_Export.png', width: 1920, height: 1080 },
  { html: '09_Landing_Product_Entry.html', png: '09_Landing_Product_Entry.png', width: 1920, height: 1400 }
];

console.log('Rendering screenshots from local HTML files using Chrome Headless...');

for (const item of files) {
  const htmlFilePath = path.join(stitchDir, item.html);
  const outputPngPath = path.join(stitchDir, item.png);
  
  if (!fs.existsSync(htmlFilePath)) {
    console.warn(`File not found: ${htmlFilePath}`);
    continue;
  }

  const fileUrl = `file:///${htmlFilePath.replace(/\\/g, '/')}`;
  console.log(`Processing: ${item.html} -> ${item.png} (${item.width}x${item.height})`);

  try {
    const cmd = `"${chromePath}" --headless=new --disable-gpu --hide-scrollbars --window-size=${item.width},${item.height} --virtual-time-budget=3500 --screenshot="${outputPngPath}" "${fileUrl}"`;
    execSync(cmd, { stdio: 'inherit' });
    console.log(`✓ Successfully captured: ${item.png}`);
  } catch (err) {
    console.error(`✗ Error capturing ${item.html}:`, err.message);
  }
}

console.log('All screenshots rendered and updated successfully!');
