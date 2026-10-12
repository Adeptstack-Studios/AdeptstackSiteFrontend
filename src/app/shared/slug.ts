/** Valid addresses: lowercase letters, digits and single dashes, e.g. "create-train-doors". */
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * "Ärger mit Größen!" -> "arger-mit-grossen", like the backend's SlugGenerator:
 * accents are dropped instead of the whole letter, everything else becomes a dash.
 */
export function slugify(text: string) {
  return text.replace(/ß/g, 'ss').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
