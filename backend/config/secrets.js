const fs = require('fs');

function readJsonFile(file) {
  if (!file || !fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function loadSecrets() {
  const provider = (process.env.SECRETS_PROVIDER || 'env').toLowerCase();
  if (provider === 'file') {
    const secrets = readJsonFile(process.env.SECRETS_FILE || '/run/secrets/rareoud.json');
    for (const [key, value] of Object.entries(secrets)) if (!process.env[key]) process.env[key] = String(value);
  }
  // Vault/Doppler/AWS Secrets Manager are supported through runtime injection:
  // export secrets into the process environment before boot, or mount a JSON file and set SECRETS_PROVIDER=file.
  return { provider };
}

module.exports = { loadSecrets };
