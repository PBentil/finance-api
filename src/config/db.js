import {Pool} from 'pg';
import "dotenv/config";

const pool = new Pool({
    user: process.env.DB_USER,
    password:process.env.DB_PASSWORD,
    host:process.env.DB_HOST,
    port:process.env.DB_PORT,
    database:process.env.DB_NAME,
});


export const query = (text, params) => pool.query(text, params);


export const initDB = async () => {
    try {
        await pool.query(`CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        amount INTEGER NOT NULL,
        category VARCHAR(255) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`);
        console.log("Database initialized");
    } catch (error) {
        console.error("Error initializing database:", error);
        process.exit(1);
    }

}