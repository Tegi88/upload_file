const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

// 1. הגדרת ספריית היעד להעלאות
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 2. הגדרת Multer לטיפול בהעלאת קבצים
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// פילטר לסוגי קבצים מותרים
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'text/plain'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPG, PNG, PDF and TXT files are allowed.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 1024 * 1024 * 5 // הגבלת גודל ל-5MB
    }
});

// 3. הגדרת הנתיבים

// דף בית עם טופס להעלאת קבצים
app.get('/', (req, res) => {
    res.send(`
        <h1>File Upload Example</h1>
        <h2>Upload Single File</h2>
        <form action="/upload" method="post" enctype="multipart/form-data">
            <input type="file" name="file" />
            <button type="submit">Upload</button>
        </form>
        
        <h2>Upload Multiple Files</h2>
        <form action="/upload-multiple" method="post" enctype="multipart/form-data">
            <input type="file" name="files" multiple />
            <button type="submit">Upload</button>
        </form>
    `);
});

// העלאת קובץ בודד
app.post('/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send('No file uploaded.');
        }
        res.send(`
            <h1>File Uploaded Successfully</h1>
            <p>Filename: ${req.file.filename}</p>
            <p>Size: ${req.file.size} bytes</p>
            <p>Type: ${req.file.mimetype}</p>
            <a href="/download/${req.file.filename}">Download File</a>
            <br/><br/>
            <a href="/">Back to upload form</a>
        `);
    } catch (err) {
        res.status(500).send('Error uploading file');
    }
});

// העלאת מספר קבצים
app.post('/upload-multiple', upload.array('files', 5), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).send('No files uploaded.');
        }

        let responseHtml = `<h1>${req.files.length} Files Uploaded Successfully</h1>`;
        req.files.forEach(file => {
            responseHtml += `
                <div style="margin-bottom: 20px; border-bottom: 1px solid #ccc; padding-bottom: 10px;">
                    <p>Filename: ${file.filename}</p>
                    <p>Size: ${file.size} bytes</p>
                    <p>Type: ${file.mimetype}</p>
                    <a href="/download/${file.filename}">Download File</a>
                </div>
            `;
        });
        responseHtml += `<a href="/">Back to upload form</a>`;

        res.send(responseHtml);
    } catch (err) {
        res.status(500).send('Error uploading files');
    }
});

// הורדת קבצים
app.get('/download/:filename', (req, res) => {
    const filePath = path.join(uploadDir, req.params.filename);
    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else {
        res.status(404).send(`
            <h1>File Not Found</h1>
            <p>The requested file does not exist.</p>
            <a href="/">Back to upload form</a>
        `);
    }
});

// 4. טיפול בשגיאות
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        res.status(400).send(`
            <h1>Upload Error</h1>
            <p>${err.message}</p>
            <p>${err.code === 'LIMIT_FILE_SIZE' ? 'File is too large. Maximum size is 5MB.' : ''}</p>
            <a href="/">Back to upload form</a>
        `);
    } else if (err) {
        res.status(500).send(`
            <h1>Server Error</h1>
            <p>${err.message}</p>
            <a href="/">Back to upload form</a>
        `);
    }
    next();
});

// 5. הפעלת השרת
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Upload directory: ${uploadDir}`);
});