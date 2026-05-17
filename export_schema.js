import pool from './server/db.js';
import fs from 'fs';

async function main() {
  const [tables] = await pool.query("SHOW TABLES");
  fs.mkdirSync('db', { recursive: true });
  let allSQL = '-- Biofridge Database Schema\n-- Generated: ' + new Date().toISOString() + '\n\n';

  for (const row of tables) {
    const name = Object.values(row)[0];
    const [[createRow]] = await pool.query(`SHOW CREATE TABLE \`${name}\``);
    const ddl = createRow['Create Table'] + ';\n';
    allSQL += '-- Table: ' + name + '\n' + ddl + '\n';
    fs.writeFileSync('db/' + name + '.sql', ddl);
    console.log('  Exported:', name);
  }

  fs.writeFileSync('db/schema.sql', allSQL);
  console.log('\nDone. ' + tables.length + ' tables exported to db/');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
