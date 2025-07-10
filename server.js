import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import {rateLimit} from "express-rate-limit";
import transactionsRoute from "./routes/transactionsRoute.js";
import sequelize from "./config/db.js";
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

app.use( limiter );
app.use(express.json());



app.get('/', (req, res) => {
  res.send('Server is working');
});



app.use("/api/transactions", transactionsRoute);
app.use("/api/auth", authRoute);

sequelize.authenticate()
    .then(() => {
      console.log('Database connected...');

      return sequelize.sync();
    })
    .then(() => {
      console.log('Models synchronized');
      app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
    })
    .catch((err) => {
      console.error('Unable to connect to the database:', err);
    });
