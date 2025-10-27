const bcrypt = require('bcryptjs');

const generateHash = async (password) => {
  try {
    // Генерируем соль и хеш
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);
    
    console.log('====================================');
    console.log('Password:', password);
    console.log('Hash:', hash);
    console.log('====================================');
    
    return hash;
  } catch (error) {
    console.error('Error generating hash:', error);
  }
};

// Генерируем хеш для password123
generateHash('password123');