/** File checks before an upload starts, so a wrong file fails right away and with a clear reason. */

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];
const INSTALLER_EXTENSIONS = ['.exe', '.msi'];
const VIDEO_EXTENSIONS = ['.mp4', '.webm'];

export function isImageFile(file: File) {
  return hasExtension(file, IMAGE_EXTENSIONS);
}

export function isInstallerFile(file: File) {
  return hasExtension(file, INSTALLER_EXTENSIONS);
}

export function isVideoFile(file: File) {
  return hasExtension(file, VIDEO_EXTENSIONS);
}

export const IMAGE_FILE_HINT = 'Please choose a .png, .jpg or .webp image.';
export const INSTALLER_FILE_HINT = 'Please choose an .exe or .msi installer.';
export const VIDEO_FILE_HINT = 'Please choose an .mp4 or .webm video.';

function hasExtension(file: File, extensions: string[]) {
  const name = file.name.toLowerCase();
  return extensions.some(extension => name.endsWith(extension));
}
