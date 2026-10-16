import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 1. Leer version.json
const versionFilePath = path.join(rootDir, 'version.json');
let versionData = {
  version: '1.0.0',
  buildNumber: 1,
  type: 'ota',
  title: 'Parche de actualización',
  changelog: 'Mejoras y correcciones.',
  bundleUrl: 'https://raw.githubusercontent.com/WakysGood/WF-Watch-Friends/main/updates/dist.zip',
  apkUrl: 'https://github.com/WakysGood/WF-Watch-Friends/releases/latest/download/WF-Watch-Friends.apk',
};

if (fs.existsSync(versionFilePath)) {
  try {
    versionData = JSON.parse(fs.readFileSync(versionFilePath, 'utf-8'));
  } catch (_) {}
}

// Argumentos: node scripts/prepare-update.js [ota|apk] [changelog]
const updateType = process.argv[2] === 'apk' ? 'apk' : 'ota';
const customChangelog = process.argv.slice(3).join(' ').trim();

// Incrementar build y version
const oldVersion = versionData.version || '1.0.0';
const parts = oldVersion.split('.').map((n) => parseInt(n, 10) || 0);
if (updateType === 'apk') {
  parts[1] = (parts[1] || 0) + 1;
  parts[2] = 0;
} else {
  parts[2] = (parts[2] || 0) + 1;
}
const nextVersion = parts.join('.');
const nextBuild = (Number(versionData.buildNumber) || 1) + 1;

versionData.version = nextVersion;
versionData.buildNumber = nextBuild;
versionData.type = updateType;
versionData.title =
  updateType === 'ota'
    ? `Parche v${nextVersion} disponible`
    : `Actualización mayor v${nextVersion} (APK)`;
if (customChangelog) {
  versionData.changelog = customChangelog;
}

console.log(`\n🚀 Preparando actualización tipo [${updateType.toUpperCase()}]`);
console.log(`   Versión anterior: v${oldVersion}`);
console.log(`   Nueva versión:   v${nextVersion} (Build ${nextBuild})\n`);

// 2. Compilar aplicación
console.log('📦 Compilando versión de producción con Vite...');
execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });

// 3. Crear carpeta updates/ y empaquetar dist.zip
const updatesDir = path.join(rootDir, 'updates');
if (!fs.existsSync(updatesDir)) {
  fs.mkdirSync(updatesDir, { recursive: true });
}

const zipPath = path.join(updatesDir, 'dist.zip');
console.log('🗜️ Comprimiendo bundle web en updates/dist.zip...');
// Usar zip estándar de linux
execSync(`cd dist && zip -r "${zipPath}" ./*`, {
  cwd: rootDir,
  stdio: 'inherit',
});

// 4. Calcular checksum SHA-256 del zip para CapacitorUpdater v8
const zipBuffer = fs.readFileSync(zipPath);
const checksum = crypto.createHash('sha256').update(zipBuffer).digest('hex');
versionData.checksum = checksum;

// 5. Guardar version.json actualizado
fs.writeFileSync(
  versionFilePath,
  JSON.stringify(versionData, null, 2) + '\n',
  'utf-8'
);

console.log('\n✅ ¡Actualización preparada exitosamente!');
console.log(`📄 Archivo version.json actualizado.`);
console.log(`🔑 Checksum SHA-256: ${checksum}`);
console.log(`📦 Archivo updates/dist.zip generado (${(fs.statSync(zipPath).size / 1024 / 1024).toFixed(2)} MB).`);
console.log('\nPara publicar los cambios a tus usuarios, solo haz:');
console.log('  git add .');
console.log(`  git commit -m "Publicar parche v${nextVersion}"`);
console.log('  git push\n');
