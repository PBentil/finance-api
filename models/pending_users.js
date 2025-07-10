export default (sequelize, DataTypes) => {
    const PendingUser = sequelize.define('pending_users', {
        email: {
            type: DataTypes.STRING,
            unique: true,
            allowNull: false,
            validate: {
                isEmail: true
            }
        },
        password_hash: {
            type: DataTypes.STRING,
            allowNull: false
        },
        otp: {
            type: DataTypes.STRING,
            allowNull: false
        },
        otp_expiry: {
            type: DataTypes.DATE,
            allowNull: false
        }
    }, {
        timestamps: true
    });

    return PendingUser;
};
