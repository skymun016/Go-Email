const bcrypt = require('bcryptjs');

async function createAdmin() {
  const password = 'admin123';
  const hash = await bcrypt.hash(password, 10);
  console.log('Password hash:', hash);
  console.log('Plain password:', password);
}

createAdmin();
