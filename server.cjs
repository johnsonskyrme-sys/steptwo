const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 5000;

// MIME types mapping
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return mimeTypes[ext] || 'application/octet-stream';
}

function serveFile(res, filePath) {
  if (!fs.existsSync(filePath)) {
    res.writeHead(404, {'Content-Type': 'text/html'});
    res.end('<h1>404 - File Not Found</h1>');
    return;
  }

  const mimeType = getMimeType(filePath);
  const content = fs.readFileSync(filePath);
  
  res.writeHead(200, {
    'Content-Type': mimeType,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(content);
}

function generateHomePage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>STEPTWO V2 - Chrome Extension Development Server</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1200px; 
            margin: 0 auto; 
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #333;
        }
        .container {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 16px;
            padding: 40px;
            box-shadow: 0 8px 32px rgba(31, 38, 135, 0.37);
            backdrop-filter: blur(4px);
        }
        h1 { 
            color: #2c3e50; 
            border-bottom: 3px solid #3498db; 
            padding-bottom: 10px;
            margin-bottom: 30px;
        }
        .status { 
            background: #e8f5e8; 
            border: 1px solid #4caf50; 
            border-radius: 8px; 
            padding: 15px; 
            margin: 20px 0;
        }
        .files-section {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .file-link {
            display: inline-block;
            background: #3498db;
            color: white;
            padding: 8px 16px;
            margin: 5px;
            text-decoration: none;
            border-radius: 6px;
            transition: background 0.3s;
        }
        .file-link:hover {
            background: #2980b9;
        }
        .instruction {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .code {
            background: #f4f4f4;
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 10px;
            font-family: 'Courier New', monospace;
            margin: 10px 0;
        }
        ul { line-height: 1.6; }
        li { margin: 8px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 STEPTWO V2 - Chrome Extension Development Server</h1>
        
        <div class="status">
            <h3>✅ Server Status: Running</h3>
            <p><strong>Port:</strong> ${PORT}</p>
            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        </div>

        <div class="instruction">
            <h3>🔧 How to Load the Extension in Chrome</h3>
            <ol>
                <li>Open Chrome and go to <span class="code">chrome://extensions/</span></li>
                <li>Enable "Developer mode" (toggle in the top right)</li>
                <li>Click "Load unpacked"</li>
                <li>Select this project's root directory</li>
                <li>The extension should appear in your extensions list</li>
                <li>Pin the extension by clicking the puzzle piece icon and pinning "STEPTWO V2"</li>
            </ol>
        </div>

        <div class="files-section">
            <h3>📁 Extension Files</h3>
            <a href="/manifest.json" class="file-link">manifest.json</a>
            <a href="/ui/windowed-dashboard.html" class="file-link">Windowed Dashboard</a>
            <a href="/ui/debug-dashboard.html" class="file-link">Debug Dashboard</a>
            <a href="/ui/debug.html" class="file-link">Debug</a>
        </div>

        <div class="files-section">
            <h3>📊 Project Information</h3>
            <p><strong>Extension Name:</strong> STEPTWO V2</p>
            <p><strong>Version:</strong> 0.2.0</p>
            <p><strong>Description:</strong> Professional Web Scraper with bulk download capabilities</p>
            <p><strong>Type:</strong> Chrome Extension (Manifest V3)</p>
            <p><strong>Features:</strong> AI-powered pattern recognition, enterprise-level reliability, bulk downloads</p>
        </div>

        <div class="instruction">
            <h3>🛠️ Development Commands</h3>
            <div class="code">npm run build</div>
            <p>Builds and validates the extension</p>
            <div class="code">npm run dev</div>
            <p>Runs build and shows development message</p>
            <div class="code">npm run lint</div>
            <p>Runs ESLint code quality checks</p>
        </div>
    </div>
</body>
</html>`;
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let filePath = parsedUrl.pathname;

  // Handle root path
  if (filePath === '/') {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(generateHomePage());
    return;
  }

  // Remove leading slash and resolve to actual file path
  filePath = filePath.substring(1);
  const fullPath = path.join(__dirname, filePath);

  // Security check - prevent directory traversal
  if (!fullPath.startsWith(__dirname)) {
    res.writeHead(403, {'Content-Type': 'text/html'});
    res.end('<h1>403 - Forbidden</h1>');
    return;
  }

  serveFile(res, fullPath);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 STEPTWO V2 Development Server running on http://0.0.0.0:${PORT}`);
  console.log(`📁 Serving files from: ${__dirname}`);
  console.log(`🔧 Load extension from this directory in Chrome`);
  console.log(`📊 Dashboard: http://0.0.0.0:${PORT}/ui/windowed-dashboard.html`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down development server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});