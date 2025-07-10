import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import db from "../models/index.js";
const { users, pending_users } = db;
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

export async function register(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const userExists = await users.findOne({ where: { email } });
        const pendingExists = await pending_users.findOne({ where: { email } });

        if (userExists || pendingExists) {
            return res.status(400).json({ message: "User with this email already exists or is pending verification" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date(Date.now() + 10 * 60 * 1000);

        await pending_users.create({
            email,
            password_hash: hashedPassword,
            otp,
            otp_expiry: expiry
        });

        await sendOtpEmail(email, otp);

        res.status(201).json({ message: "Verification code sent to your email" });

    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}



export async function login(req, res) {
    try {
        const { email, password } = req.body;

        const user = await users.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        if (!user.is_verified) {
            return res.status(403).json({ message: "Account not verified." });
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

        const user = await pending_users.findOne({ where: { email } });

        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        const now = new Date();
        const otpExpiry = new Date(user.otp_expiry);
        const cooldownThreshold = new Date(otpExpiry.getTime() - 570000);

        if (now < cooldownThreshold) {
            return res.status(429).json({ message: "Please wait before requesting another OTP." });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const newExpiry = new Date(Date.now() + 10 * 60 * 1000);

        await pending_users.update(
            { otp, otp_expiry: newExpiry },
            { where: { email } }
        );

        await sendOtpEmail(email, otp);
        res.status(200).json({ message: "OTP resent to email." });

    } catch (error) {
        console.error("Resend OTP error:", error);
        res.status(500).json({ message: "Internal server error." });
    }
}


export async function verifyOtp(req, res) {
    try {
        const { email, otp } = req.body;

        const pendingUser = await pending_users.findOne({
            where: {
                email,
                otp,
                otp_expiry: { [db.Sequelize.Op.gt]: new Date() }
            }
        });

        if (!pendingUser) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        await users.create({
            email,
            password_hash: pendingUser.password_hash,
            is_verified: true
        });

        await pending_users.destroy({ where: { email } });

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

