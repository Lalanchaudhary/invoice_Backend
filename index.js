const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const rateLimit = require("express-rate-limit");

dotenv.config();

const app = express();

// Ensure uploads directory exists
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files with optional cache headers
app.use('/uploads', express.static('uploads', {
  setHeaders: (res, path) => {
    res.setHeader("Cache-Control", "public, max-age=31536000");
  }
}));

// Health check route
app.get("/", (req, res) => {
  res.send("Welcome");
});

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed (jpeg, jpg, png, webp)"));
  }
};

const upload = multer({ storage, fileFilter });

// Upload route
app.post('/upload-logo', upload.single('logo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded or invalid file type' });
  }
  res.json({ logoURL: `https://invoice-backend-ykyx.onrender.com/uploads/${req.file.filename}` });
});

// Email rate limiter
const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 5,
  message: "Too many email requests from this IP, please try again later."
});

// Email route
app.post("/email", emailLimiter, async (req, res) => {
  try {
    const { email, downloadURL } = req.body;

    if (!email || !downloadURL) {
      return res.status(400).json({ success: false, message: "Email and downloadURL are required" });
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"Support Team" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your Invoice Download Link",
      text: `Download your invoice here: ${downloadURL}`,
      html: `<p>You can download your invoice from here: <a href="${downloadURL}">${downloadURL}</a></p>`,
    });

    console.log("Message sent: %s", info.messageId);
    res.status(200).json({ success: true, message: "Email sent successfully!" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ success: false, message: "Failed to send email" });
  }
});

app.listen(9000, () => {
  console.log("====================================");
  console.log("Server is running at PORT 9000");
  console.log("====================================");
});
