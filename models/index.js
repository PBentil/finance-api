import Sequelize from 'sequelize';
import sequelize from '../config/db.js';

import userModel from './user.js';
import transactionModel from './transactions.js';
import pendingUserModel from './pending_users.js';

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.users = userModel(sequelize, Sequelize.DataTypes);
db.transactions = transactionModel(sequelize, Sequelize.DataTypes);
db.pending_users = pendingUserModel(sequelize, Sequelize.DataTypes);

if (db.transactions.associate) db.transactions.associate(db);
if (db.users.associate) db.users.associate(db);

export default db;
