const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { ensureDbConnection, closeDbConnection, ensureBackupsRoot } = require('./_shared');

const askConfirmation = async (question) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer = await new Promise((resolve) => {
    rl.question(question, (value) => resolve(value));
  });

  rl.close();
  return String(answer || '').trim();
};

const getLatestBackupDir = (root) => {
  const entries = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  if (entries.length === 0) {
    return null;
  }

  return path.join(root, entries[entries.length - 1]);
};

const restoreDatabase = async ({ backupPath } = {}) => {
  const root = ensureBackupsRoot();
  const selectedPath = backupPath || getLatestBackupDir(root);

  if (!selectedPath || !fs.existsSync(selectedPath)) {
    throw new Error('No backup directory found to restore from.');
  }

  const answer = await askConfirmation(
    `This will overwrite collections from backup at ${selectedPath}. Type RESTORE to continue: `
  );

  if (answer !== 'RESTORE') {
    throw new Error('Restore aborted by user.');
  }

  const connection = await ensureDbConnection();
  const files = fs.readdirSync(selectedPath).filter((name) => name.endsWith('.json'));
  const summary = {};

  for (const file of files) {
    const collectionName = file.replace(/\.json$/, '');
    const fullPath = path.join(selectedPath, file);
    const docs = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

    await connection.db.collection(collectionName).deleteMany({});
    if (Array.isArray(docs) && docs.length > 0) {
      await connection.db.collection(collectionName).insertMany(docs, { ordered: false });
    }

    const count = await connection.db.collection(collectionName).countDocuments();
    summary[collectionName] = count;
  }

  return {
    restoredFrom: selectedPath,
    collections: summary,
  };
};

if (require.main === module) {
  const arg = process.argv[2];
  restoreDatabase({ backupPath: arg })
    .then((result) => {
      console.log('Restore completed');
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      console.error('Restore failed:', error.message);
      process.exitCode = 1;
    })
    .finally(async () => {
      await closeDbConnection();
    });
}

module.exports = {
  restoreDatabase,
};
