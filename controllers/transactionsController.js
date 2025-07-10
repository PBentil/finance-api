import db from '../models/index.js';
const { transactions } = db;

export async function Transaction(req, res) {
    try {
        const { user_id, title, amount, category, type } = req.body;

        if (!user_id || !title || !category || !type || amount === undefined) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        if (type !== 'income' && type !== 'expense') {
            return res.status(400).json({ success: false, message: "Type must be 'income' or 'expense'" });
        }

        const positiveAmount = Math.abs(amount);

        const newTransaction = await transactions.create({
            user_id,
            title,
            amount: positiveAmount,
            category,
            type,
        });

        res.status(201).json({
            success: true,
            message: "Transaction added successfully",
            data: newTransaction,
        });
    } catch (error) {
        console.error("Error creating transaction:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
}

export async function getTransactions(req, res) {
    try {
        const userId = req.params.id;

        const allTransactions = await transactions.findAll({
            where: { user_id: userId },
            order: [['createdAt', 'DESC']],
        });

        if (!allTransactions.length) {
            return res.status(404).json({ message: "No transactions found for this user" });
        }

        res.status(200).json(allTransactions);
    } catch (error) {
        console.error("Error getting transactions:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function deleteTransactions(req, res) {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const transaction = await transactions.findOne({
            where: { id, user_id: userId },
        });

        if (!transaction) {
            return res.status(404).json({ message: "Transaction not found or not authorized" });
        }

        await transaction.destroy();

        res.status(200).json({ message: "Transaction deleted successfully" });
    } catch (error) {
        console.error("Error deleting transaction:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function transactionSummary(req, res) {
    try {
        const userId = req.params.id;

        const income = await transactions.sum('amount', {
            where: { user_id: userId, type: 'income' }
        });

        const expense = await transactions.sum('amount', {
            where: { user_id: userId, type: 'expense' }
        });

        const balance = (income || 0) - (expense || 0);

        res.status(200).json({
            balance,
            income: income || 0,
            expenses: expense || 0,
        });

    } catch (error) {
        console.error("Error getting transaction summary:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
