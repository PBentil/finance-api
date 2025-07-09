import { query } from "../config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
// import nodemailer from "nodemailer";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
// const EMAIL_USER = process.env.EMAIL_USER;
// const EMAIL_PASS = process.env.EMAIL_PASS;

// Helper: Send OTP Email
// async function sendOtpEmail(email, otp) {
//     const transporter = nodemailer.createTransport({
//         service: "Gmail",
//         auth: {
//             user: EMAIL_USER,
//             pass: EMAIL_PASS,
//         },
//     });
//
//     await transporter.sendMail({
//         from: `"My App" <${EMAIL_USER}>`,
//         to: email,
//         subject: "Your OTP Code",
//         text: `Your verification code is: ${otp}`,
//     });
// }

async function sendOtpEmail(email, otp) {
    console.log(`Sending OTP to ${email} is ${otp}`);
}

// REGISTER
export async function register(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: "Please provide a valid email" });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters long" });
        }

        const userCheck = await query('SELECT * FROM users WHERE email = $1', [email]);
        const pendingCheck = await query('SELECT * FROM pending_users WHERE email = $1', [email]);

        if (userCheck.rows.length > 0 || pendingCheck.rows.length > 0) {
            return res.status(400).json({ message: "User with this email already exists or is pending verification" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        await query(
            'INSERT INTO pending_users (email, password_hash, otp, otp_expiry) VALUES ($1, $2, $3, NOW() + interval \'10 minutes\')',
            [email, hashedPassword, otp]
        );

        console.log(otp)
        await sendOtpEmail(email, otp);

        res.status(201).json({ message: "Verification code sent to your email" });

    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}


// LOGIN
// LOGIN
export async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const result = await query('SELECT * FROM users WHERE email = $1', [email]);

        if (result.rows.length === 0) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const user = result.rows[0];

        if (!user.is_verified) {
            return res.status(403).json({ message: "Account not verified. Please verify using the OTP sent to your email." });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const accessToken = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: "15m" }
        );

        const refreshToken = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: "30d" }
        );

        // Optional: Store refreshToken in DB or in-memory store for revocation

        res.status(200).json({
            token: accessToken,
            refreshToken,
            message: "Login successful",
            user: { id: user.id, email: user.email }
        });

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}


export async function resendOtp(req, res) {
    try {
        const { email } = req.body;

        if (!email || typeof email !== 'string') {
            return res.status(400).json({ message: "Valid email is required." });
        }

        const userResult = await query('SELECT * FROM pending_users WHERE email = $1', [email]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: "User not found." });
        }

        const user = userResult.rows[0];

        if (user.is_verified) {
            return res.status(400).json({ message: "User is already verified." });
        }

        const lastExpiry = new Date(user.otp_expiry);
        const now = new Date();
        if (lastExpiry && now < new Date(lastExpiry.getTime() - 570000)) {
            return res.status(429).json({ message: "Please wait before requesting another OTP." });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        await query(
            "UPDATE pending_users SET otp = $1, otp_expiry = NOW() + interval '10 minutes' WHERE email = $2",
            [otp, email]
        );

        await sendOtpEmail(email, otp);

        res.status(200).json({ message: "OTP resent to email." });

    } catch (error) {
        console.error("Resend OTP error:", error);
        res.status(500).json({ message: "Internal server error." });
    }
}

// VERIFY OTP
export async function verifyOtp(req, res) {
    try {
        const { email, otp } = req.body;

        const result = await query(
            "SELECT * FROM pending_users WHERE email = $1 AND otp = $2 AND otp_expiry > NOW()",
            [email, otp]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        const { password_hash } = result.rows[0];

        await query(
            "INSERT INTO users (email, password_hash, is_verified) VALUES ($1, $2, true)",
            [email, password_hash]
        );

        // Remove from pending_users
        await query("DELETE FROM pending_users WHERE email = $1", [email]);

        res.status(200).json({ message: "OTP verified successfully. You can now log in." });

    } catch (error) {
        console.error("Verify OTP error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}


export function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: "Access denied, no token provided" });
    }

    if (!JWT_SECRET) {
        console.error("JWT_SECRET is not defined");
        return res.status(500).json({ message: "Server configuration error" });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            console.error("Token verification error:", err);
            return res.status(403).json({ message: "Invalid or expired token" });
        }
        req.user = decoded;
        next();
    });
}


export function refreshAccessToken(req, res) {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(401).json({ message: "Refresh token required" });
    }

    jwt.verify(refreshToken, JWT_REFRESH_SECRET, (err, decoded) => {
        if (err) {
            console.error("Refresh token error:", err);
            return res.status(403).json({ message: "Invalid or expired refresh token" });
        }

        const newAccessToken = jwt.sign(
            { id: decoded.id, email: decoded.email },
            JWT_SECRET,
            { expiresIn: "15m" }
        );

        res.status(200).json({ token: newAccessToken });
    });
}

