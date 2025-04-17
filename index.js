const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const multer = require('multer');
const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json()); // ✅ Enables JSON parsing
app.use(bodyParser.urlencoded({ extended: true })); // ✅ Handles form data


app.get("/", (req, res) => {
  res.send("Welcome");
});


app.use('/uploads', express.static('uploads')); // serve static files

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // unique file name
  },
});

const upload = multer({ storage });
// Handle image upload
app.post('/upload-logo', upload.single('logo'), (req, res) => {
  console.log("hello");
  
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  res.json({ logoURL: `http://localhost:5000/uploads/${req.file.filename}` });
});


app.post("/email", async (req, res) => {
  try {
    const { email, downloadURL } = req.body;

    if (!email || !downloadURL) {
      return res.status(400).json({ success: false, message: "Email and downloadURL are required" });
    }

    console.log("Sending email to:", email, "Download URL:", downloadURL);

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
      from: `"Support Team" <${process.env.EMAIL_USER}>`, // ✅ Dynamic sender email
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