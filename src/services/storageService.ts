import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { storage } from './firebase';

/**
 * Envia uma imagem local ao Firebase Storage e devolve a URL pública final.
 * Somente essa URL é gravada no Firestore (nunca Base64).
 */
export async function uploadImage(path: string, localUri: string): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();
  const imageRef = ref(storage, path);
  await uploadBytes(imageRef, blob, { contentType: blob.type || 'image/jpeg' });
  return getDownloadURL(imageRef);
}
