import fs from "node:fs";
import path from "node:path";
import { google } from "googleapis";

function authClient() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return new google.auth.GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/drive"],
    });
  }
  throw new Error(
    "Drive auth not configured. Set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON path."
  );
}

let _drive;
export function drive() {
  if (_drive) return _drive;
  const auth = authClient();
  _drive = google.drive({ version: "v3", auth });
  return _drive;
}

export async function listFolder(folderId) {
  const out = [];
  let pageToken;
  do {
    const res = await drive().files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken, files(id, name, mimeType, size, md5Checksum)",
      pageSize: 1000,
      pageToken,
    });
    out.push(...(res.data.files ?? []));
    pageToken = res.data.nextPageToken;
  } while (pageToken);
  return out;
}

export async function findInFolder(folderId, name) {
  const res = await drive().files.list({
    q: `'${folderId}' in parents and name = '${name.replace(/'/g, "\\'")}' and trashed = false`,
    fields: "files(id, name, mimeType, size)",
    pageSize: 10,
  });
  return res.data.files?.[0] ?? null;
}

export async function findOrCreateFolder(parentId, name) {
  const existing = await findInFolder(parentId, name);
  if (existing && existing.mimeType === "application/vnd.google-apps.folder") {
    return existing;
  }
  const res = await drive().files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id, name, mimeType",
  });
  return res.data;
}

export async function downloadFile(fileId, destPath) {
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  const res = await drive().files.get(
    { fileId, alt: "media" },
    { responseType: "stream" }
  );
  await new Promise((resolve, reject) => {
    const sink = fs.createWriteStream(destPath);
    res.data.on("end", resolve).on("error", reject).pipe(sink);
  });
  return destPath;
}

export async function uploadFile(folderId, localPath, name = path.basename(localPath), mimeType) {
  const res = await drive().files.create({
    requestBody: { name, parents: [folderId] },
    media: {
      mimeType: mimeType ?? guessMime(name),
      body: fs.createReadStream(localPath),
    },
    fields: "id, name, size, webViewLink",
  });
  return res.data;
}

export async function ensureSubfolder(rootId, segments) {
  let parent = rootId;
  for (const seg of segments) {
    const node = await findOrCreateFolder(parent, seg);
    parent = node.id;
  }
  return parent;
}

export async function resolveSubfolderId(rootId, pathStr) {
  const segments = pathStr.split("/").filter(Boolean);
  let parent = rootId;
  for (const seg of segments) {
    const node = await findInFolder(parent, seg);
    if (!node || node.mimeType !== "application/vnd.google-apps.folder") return null;
    parent = node.id;
  }
  return parent;
}

function guessMime(name) {
  const ext = path.extname(name).toLowerCase();
  return (
    {
      ".mp3": "audio/mpeg",
      ".mp4": "video/mp4",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".json": "application/json",
      ".wav": "audio/wav",
    }[ext] ?? "application/octet-stream"
  );
}
