export default (sequelize, DataTypes) => {
  const User = sequelize.define('users', {
   email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    validate: {
     isEmail: true,
    },
   },
   password_hash: {
    type: DataTypes.STRING,
    allowNull: false,
   },
   is_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
   },
  }, {
   timestamps: true,
  });

  User.associate = (models) => {
   User.hasMany(models.transactions, {
    foreignKey: 'user_id',
    as: 'transactions',
   });
  };

  return User;
 };
