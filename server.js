const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

// יצירת ספריית uploads אם לא קיימת
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// הגדרת multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'text/plain'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 1024 * 1024 * 5 } // 5MB
});

// Middleware להגשת קבצים סטטיים
app.use('/uploads', express.static(uploadDir));

// דף ראשי עם טופס ורשימת קבצים
app.get('/', (req, res) => {
    fs.readdir(uploadDir, (err, files) => {
        if (err) {
            console.error(err);
            files = [];
        }

        res.send(renderPage(files));
    });
});

// טיפול בהעלאת קבצים
app.post('/upload', upload.array('files'), (req, res) => {
    fs.readdir(uploadDir, (err, files) => {
        if (err) {
            console.error(err);
            files = [];
        }

        res.send(renderPage(files, req.files ? 'Files uploaded successfully!' : ''));
    });
});

// מחיקת קובץ
app.get('/delete/:filename', (req, res) => {
    const filePath = path.join(uploadDir, req.params.filename);

    fs.unlink(filePath, (err) => {
        if (err) {
            console.error(err);
            return res.redirect('/?error=Failed to delete file');
        }
        res.redirect('/?message=File deleted successfully');
    });
});

// פונקציית רנדור לדף HTML
function renderPage(files, message = '') {
    let fileList = '';

    files.forEach(file => {
        const filePath = path.join(uploadDir, file);
        const stats = fs.statSync(filePath);
        const ext = path.extname(file).toLowerCase();

        fileList += `
            <div class="file-item">
                <div class="file-info">
                    <span class="file-name">${file}</span>
                    <span class="file-size">(${Math.round(stats.size / 1024)} KB)</span>
                    <a href="/uploads/${file}" download class="download-btn">Download</a>
                    <a href="/delete/${file}" class="delete-btn">Delete</a>
                </div>
                ${['.jpg', '.jpeg', '.png', '.gif'].includes(ext) ?
                `<img src="/uploads/${file}" class="file-preview">` : ''}
                ${ext === '.txt' ?
                `<pre class="text-preview">${fs.readFileSync(filePath, 'utf-8').substring(0, 200)}...</pre>` : ''}
            </div>
        `;
    });

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>File Upload</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                    line-height: 1.6;
                }
                h1 { color: #333; }
                .upload-form {
                    background: #f4f4f4;
                    padding: 20px;
                    border-radius: 5px;
                    margin-bottom: 20px;
                }
                .file-list {
                    margin-top: 30px;
                }
                .file-item {
                    border: 1px solid #ddd;
                    padding: 15px;
                    margin-bottom: 15px;
                    border-radius: 5px;
                }
                .file-info {
                    margin-bottom: 10px;
                }
                .file-name {
                    font-weight: bold;
                    margin-right: 10px;
                }
                .file-size {
                    color: #666;
                    margin-right: 15px;
                }
                .file-preview {
                    max-width: 100%;
                    max-height: 300px;
                    display: block;
                    margin-top: 10px;
                }
                .text-preview {
                    background: #f8f8f8;
                    padding: 10px;
                    border-radius: 3px;
                    white-space: pre-wrap;
                    margin-top: 10px;
                }
                .download-btn, .delete-btn {
                    padding: 3px 8px;
                    text-decoration: none;
                    border-radius: 3px;
                    font-size: 14px;
                }
                .download-btn {
                    background: #4CAF50;
                    color: white;
                    margin-right: 8px;
                }
                .delete-btn {
                    background: #f44336;
                    color: white;
                }
                .message {
                    padding: 10px;
                    margin-bottom: 20px;
                    border-radius: 3px;
                }
                .success {
                    background: #dff0d8;
                    color: #3c763d;
                }
                .error {
                    background: #f2dede;
                    color: #a94442;
                }
            </style>
        </head>
        <body>
            <h1>File Upload Center</h1>
            
            ${message ? `<div class="message ${message.includes('success') ? 'success' : 'error'}">${message}</div>` : ''}
            
            <div class="upload-form">
                <h2>Upload Files</h2>
                <form action="/upload" method="post" enctype="multipart/form-data">
                    <input type="file" name="files" multiple>
                    <button type="submit" style="margin-top: 10px; padding: 8px 15px;">Upload Files</button>
                </form>
            </div>
            
            <div class="file-list">
                <h2>Uploaded Files</h2>
                ${files.length > 0 ? fileList : '<p>No files uploaded yet.</p>'}
            </div>
        </body>
        </html>
    `;
}

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});