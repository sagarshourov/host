const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'real_estate_db',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'password',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      // This ensures Sequelize handles UUIDs without PostgreSQL extensions
      timestamps: true,
      underscored: false
    }
  }
);

// Test connection and setup
sequelize.authenticate()
  .then(async () => {
    console.log('✅ Database connected successfully');
    
    // Try to enable UUID extension (optional, not required with DataTypes.UUIDV4)
    // try {
    //   //await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    //   //console.log('✅ UUID extension enabled');
    // } catch (err) {
    //   console.log('ℹ️ UUID extension not available, using Sequelize UUIDs');
    // }
  })
  .catch(err => {
    console.error('❌ Unable to connect to database:', err);
  });

module.exports = sequelize;