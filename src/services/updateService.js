import { Capacitor, registerPlugin } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { Filesystem, Directory } from '@capacitor/filesystem';
import versionData from '../../version.json';

const ApkInstaller = registerPlugin('ApkInstaller');
const isNative = Capacitor.isNativePlatform();

export const CURRENT_APP_VERSION = versionData.version || '1.0.1';
export const CURRENT_BUILD_NUMBER = Number(versionData.buildNumber) || 2;
export const GITHUB_VERSION_URL =
  'https://raw.githubusercontent.com/WakysGood/WF-Watch-Friends/main/version.json';

/**
 * Compara dos versiones semánticas (ej: '1.0.1' vs '1.0.0')
 * Retorna 1 si v1 > v2, -1 si v1 < v2, y 0 si son iguales
 */
export function compareVersions(v1 = '0.0.0', v2 = '0.0.0') {
  const parts1 = String(v1)
    .replace(/^v/, '')
    .split('.')
    .map((n) => parseInt(n, 10) || 0);
  const parts2 = String(v2)
    .replace(/^v/, '')
    .split('.')
    .map((n) => parseInt(n, 10) || 0);

  const len = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < len; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

/**
 * Notifica al gestor de actualizaciones que la aplicación inició correctamente
 */
export async function notifyAppReady() {
  if (!isNative) return;
  try {
    await CapacitorUpdater.notifyAppReady();
  } catch (err) {
    console.warn('CapacitorUpdater notifyAppReady error:', err);
  }
}

/**
 * Consulta en GitHub si existe una versión más reciente
 */
export async function checkForUpdate() {
  try {
    const cacheBuster = `?t=${Date.now()}`;
    const res = await fetch(`${GITHUB_VERSION_URL}${cacheBuster}`, {
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    });

    if (!res.ok) {
      return { hasUpdate: false, error: 'No se pudo conectar a GitHub' };
    }

    const remote = await res.json();
    const isNewerVersion =
      compareVersions(remote.version, CURRENT_APP_VERSION) > 0;
    const isNewerBuild =
      Number(remote.buildNumber || 0) > CURRENT_BUILD_NUMBER;

    const hasUpdate = isNewerVersion || isNewerBuild;

    return {
      hasUpdate,
      currentVersion: CURRENT_APP_VERSION,
      currentBuild: CURRENT_BUILD_NUMBER,
      updateInfo: remote,
    };
  } catch (err) {
    console.warn('Check update error:', err);
    return { hasUpdate: false, error: err.message };
  }
}

/**
 * Descarga y aplica una actualización OTA (código web React en caliente)
 */
export async function applyOtaUpdate(bundleUrl, version, onProgress, checksum = '') {
  if (!bundleUrl) throw new Error('No se especificó URL del paquete de actualización');

  if (!isNative) {
    // Simulación en entorno navegador web
    for (let i = 0; i <= 100; i += 20) {
      onProgress?.(i);
      await new Promise((r) => setTimeout(r, 200));
    }
    window.location.reload();
    return;
  }

  let downloadListener = null;
  try {
    if (onProgress) {
      downloadListener = await CapacitorUpdater.addListener(
        'download',
        (info) => {
          if (info && typeof info.percent === 'number') {
            onProgress(info.percent);
          }
        }
      );
    }

    const downloadParams = {
      url: bundleUrl,
      version: version || `v-${Date.now()}`,
    };
    if (checksum) {
      downloadParams.checksum = checksum;
    }

    // Descargar el paquete comprimido
    const bundle = await CapacitorUpdater.download(downloadParams);

    onProgress?.(95);

    // Activar el nuevo bundle como la versión actual
    await CapacitorUpdater.set({ id: bundle.id });

    onProgress?.(100);

    // Reiniciar WebView con la nueva versión
    await CapacitorUpdater.reload();
  } finally {
    if (downloadListener) {
      downloadListener.remove();
    }
  }
}

/**
 * Descarga la nueva APK completa y solicita a Android abrir el instalador del sistema
 */
export async function applyApkUpdate(apkUrl, onProgress) {
  if (!apkUrl) throw new Error('No se especificó URL del archivo APK');

  if (!isNative) {
    window.open(apkUrl, '_blank');
    return;
  }

  try {
    const filename = 'update.apk';

    // Limpiar archivo previo si existía en caché
    try {
      await Filesystem.deleteFile({
        path: filename,
        directory: Directory.Cache,
      });
    } catch (_) {}

    onProgress?.(10);

    // Descargar archivo APK a la memoria de caché
    const downloadResult = await Filesystem.downloadFile({
      url: apkUrl,
      path: filename,
      directory: Directory.Cache,
      progress: true,
    });

    onProgress?.(90);

    const uriResult = await Filesystem.getUri({
      path: filename,
      directory: Directory.Cache,
    });

    onProgress?.(100);

    // Lanzar el instalador nativo de Android
    await ApkInstaller.install({ filePath: uriResult.uri });
  } catch (err) {
    console.error('Error al actualizar APK:', err);
    throw err;
  }
}
