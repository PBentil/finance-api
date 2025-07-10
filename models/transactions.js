export default (sequelize, DataTypes) => {
    const transactions = sequelize.define('transactions', {
        title: {
            type: DataTypes.STRING,
            allowNull: false
        },
        amount: {
            type: DataTypes.FLOAT,
            allowNull: false
        },
        type: {
            type: DataTypes.ENUM('income', 'expense'),
            allowNull: false
        },
        category: {
            type: DataTypes.STRING,
            allowNull: false
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        }
    }, {
        timestamps: true
    });

    transactions.associate = models => {
        transactions.belongsTo(models.users, {
            foreignKey: 'user_id',
            as: 'user'
        });
    };

    return transactions;
};
