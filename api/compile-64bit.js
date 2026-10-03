export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb"
    }
  }
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  console.log("[compile-64bit] Request received");

  try {
    const { filename, content } = req.body || {};

    if (!content || typeof content !== "string") {
      return res.status(400).json({
        success: false,
        error: "Field 'content' (base64) wajib diisi"
      });
    }

    const fileBuffer = Buffer.from(content, "base64");
    console.log("[compile-64bit] File:", filename, "size:", fileBuffer.length);

    const blob = new Blob([fileBuffer], { type: "application/octet-stream" });
    const fd = new FormData();
    fd.append("file", blob, filename || "input.lua");

    const upstream = await fetch("https://ar19-apii.vercel.app/api/compile-64bit", {
      method: "POST",
      body: fd
    });

    console.log("[compile-64bit] Upstream status:", upstream.status);

    if (!upstream.ok) {
      const errText = await upstream.text();
      console.error("[compile-64bit] Upstream error:", errText.slice(0, 300));
      return res.status(upstream.status).json({
        success: false,
        error: `Upstream error ${upstream.status}`,
        detail: errText.slice(0, 300)
      });
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    console.log("[compile-64bit] Success, output size:", buffer.length);

    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", "attachment; filename=output64.luac");
    res.setHeader("Content-Length", buffer.length);
    return res.send(buffer);

  } catch (err) {
    console.error("[compile-64bit] Error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Internal server error"
    });
  }
}