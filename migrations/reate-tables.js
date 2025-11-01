const createTables = async () => {
  const { sequelize } = require('./models');
  
  try {
    // Sync all models with database
    await sequelize.sync({ alter: true });
    console.log('Database tables created successfully');
  } catch (error) {
    console.error('Error creating database tables:', error);
  }
};