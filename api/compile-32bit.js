import formidable from "formidable";
import fs from "fs";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const form = formidable({});
  const [fields, files] = await form.parse(req);
  const file = Array.isArray(files.file) ? files.file[0] : files.file;

  if (!file) return res.status(400).json({ error: "File tidak ada" });

  const fileBuffer = fs.readFileSync(file.filepath);
  const blob = new Blob([fileBuffer], { type: "text/plain" });

  const fd = new FormData();
  fd.append("file", blob, file.originalFilename || "input.lua");

  const upstream = await fetch("https://ar19-apii.vercel.app/api/compile-32bit", {
    method: "POST",
    body: fd
  });

  if (!upstream.ok) {
    const err = await upstream.text();
    return res.status(upstream.status).send(err);
  }

  const buffer = Buffer.from(await upstream.arrayBuffer());
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Disposition", "attachment; filename=output32.luac");
  return res.send(buffer);
}
