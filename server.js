const express = require("express");
const https = require("https");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

function httpsGet(url, headers) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { reject(new Error("Invalid JSON: " + data.slice(0, 200))); }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

app.get("/splitwise/*", async (req, res) => {
  const path = req.params[0];
  const query = new URLSearchParams(req.query).toString();
  const url = `https://secure.splitwise.com/api/v3.0/${path}${query ? "?" + query : ""}`;
  const apiKey = req.headers["x-splitwise-key"];

  console.log(`[proxy] GET ${url} key=${apiKey ? apiKey.slice(0,8) + "..." : "MISSING"}`);

  if (!apiKey) return res.status(401).json({ error: "Missing API key" });

  try {
    const { status, body } = await httpsGet(url, {
      "Authorization": `Bearer ${apiKey}`,
      "Accept": "application/json"
    });
    console.log(`[proxy] Splitwise responded ${status}`);
    res.status(status).json(body);
  } catch (err) {
    console.error(`[proxy] Error: ${err.message}`);
    res.status(500).json({ error: "Proxy error", detail: err.message });
  }
});

app.get("/health", (_, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
