/** What differs inside the phone apps, where the page is not in a browser. */

import { Capacitor } from "@capacitor/core";

export function inPhoneApp(): boolean {
  return Capacitor.isNativePlatform();
}

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("The picture could not be read."));
    reader.readAsDataURL(blob);
  });
}

/**
 * Opens the phone's share sheet with the picture, from where it can be saved
 * or sent on. An app cannot download a file the way a browser does.
 */
export async function sharePicture(pictureUrl: string, filename: string): Promise<void> {
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([
    import("@capacitor/filesystem"),
    import("@capacitor/share"),
  ]);
  const picture = await (await fetch(pictureUrl)).blob();
  const file = await Filesystem.writeFile({
    path: filename,
    data: await toBase64(picture),
    directory: Directory.Cache,
  });
  try {
    await Share.share({ files: [file.uri] });
  } catch (err) {
    // Closing the share sheet without choosing anything is not a failure.
    if (!/cancel/i.test(err instanceof Error ? err.message : String(err))) throw err;
  }
}
