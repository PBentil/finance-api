import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import {rateLimit} from "express-rate-limit";
import transactionsRoute from "./routes/transactionsRoute.js";
import {initDB} from "./config/db.js";
import authRoute from "./routes/authRoute.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

const limiter = rateLimit({
  windowMs:15*60*1000,
  max:100,
  message:"Too many requests from this IP, please try again after an hour",
  standardHeaders:true,
  legacyHeaders:false,
});
app.use(limiter);
app.use(express.json());



app.get('/', (req, res) => {
  res.send('Server is working');
});



app.use("/api/transactions", transactionsRoute);
app.use("/api/auth", authRoute);

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});
