const fs = require('fs');
const path = require('path');
const { ensureDbConnection, closeDbConnection, ensureBackupsRoot, nowStamp } = require('./_shared');

const backupDatabase = async () => {
  const connection = await ensureDbConnection();
  const root = ensureBackupsRoot();
  const backupDir = path.join(root, nowStamp());
  fs.mkdirSync(backupDir, { recursive: true });

  const collections = await connection.db.listCollections().toArray();
  const summary = {};

  for (const { name } of collections) {
    const docs = await connection.db.collection(name).find({}).toArray();
    const filePath = path.join(backupDir, `${name}.json`);
    fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), 'utf8');
    summary[name] = docs.length;
  }

  return {
    backupDir,
    collections: summary,
  };
};

if (require.main === module) {
  backupDatabase()
    .then((result) => {
      console.log('Backup completed');
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      console.error('Backup failed:', error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await closeDbConnection();
    });
}

module.exports = {
  backupDatabase,
};
