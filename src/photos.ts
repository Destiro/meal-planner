import { Directory, File, Paths } from 'expo-file-system';

/** Photos from the online recipe service are links, not files on the phone. */
export const isRemotePhoto = (uri: string | undefined): boolean => !!uri && /^https?:\/\//i.test(uri);

/**
 * Copies a picked photo out of the picker's cache, which the system can clear, into app storage.
 * An online photo is kept as the link it is.
 */
export function savePhoto(sourceUri: string): string {
  if (isRemotePhoto(sourceUri)) return sourceUri;
  const dir = new Directory(Paths.document, 'recipe-photos');
  if (!dir.exists) dir.create();
  const extension = /\.[a-z0-9]{1,5}$/i.exec(sourceUri)?.[0] ?? '.jpg';
  const destination = new File(dir, `${Date.now()}${extension}`);
  new File(sourceUri).copy(destination);
  return destination.uri;
}

/** Removes a photo we saved. A missing file is fine, and an online link has nothing to remove. */
export function deletePhoto(uri: string | undefined): void {
  if (!uri || isRemotePhoto(uri)) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch (e) {
    console.warn('Could not delete photo', e);
  }
}
