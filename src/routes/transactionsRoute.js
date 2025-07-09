import express from 'express';
import {
    deleteTransactions,
    getTransactions,
    Transaction,
    transactionSummary
} from "../controllers/transactionsController.js";
import {authenticateToken} from "../controllers/authController.js";


const router = express.Router();
router.post("",Transaction)
router.get("/:id",getTransactions);
router.delete("/:id",authenticateToken, deleteTransactions);
router.get('/summary/:id', transactionSummary);
export default router;