const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { HttpsProxyAgent } = require('https-proxy-agent');
const https = require('https');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;
const PROXY_URL = process.env.MOBILE_PROXY; 
const SECRET_PIN = "Linkplay2026";

let currentCookieString = "";
let agent = null;

// 🛠️ SMART PROXY INITIALIZATION
if (PROXY_URL) {
    try {
        agent = new HttpsProxyAgent(PROXY_URL);
        console.log("🛡️ Proxy Agent initialized. Target: DataImpulse Gateway.");
    } catch (e) {
        console.log("❌ Proxy Setup Error: " + e.message);
    }
}

app.post('/update-cookie', (req, res) => {
    const { pin, newCookie } = req.body;
    if (pin !== SECRET_PIN) return res.status(403).json({ error: "Access Denied." });
    currentCookieString = newCookie;
    console.log("🔥 RENDER: New Cookie Injected.");
    res.json({ success: true, message: "Cookie updated successfully!" });
});

app.post('/getlink', async (req, res) => {
    let { url } = req.body;
    if (!url) return res.status(400).json({ error: "Missing URL" });

    try {
        const targetUrl = url.replace(new URL(url).hostname, 'www.1024terabox.com');
        
        console.log(`📡 Fetching: ${targetUrl}`);

        const requestOptions = {
            timeout: 30000,
            headers: { 
                'Cookie': currentCookieString, 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
                'Accept': '*/*',
                'Connection': 'keep-alive'
            },
            // 🚨 THIS FIXES THE SOCKET DISCONNECT: Ignore self-signed certs
            httpsAgent: agent ? agent : new https.Agent({ rejectUnauthorized: false })
        };

        const response = await axios.get(targetUrl, requestOptions);
        const html = response.data;

        const dlinkMatch = html.match(/\"dlink\":\"(.*?)\"/) || html.match(/\"download_url\":\"(.*?)\"/);
        
        if (dlinkMatch) {
            console.log("✅ SUCCESS: Link Extracted.");
            return res.json({ success: true, dlink: dlinkMatch[1].replace(/\\/g, '') });
        }
        
        res.status(404).json({ error: "Link not found in Terabox HTML." });

    } catch (error) {
        console.error("💥 ENGINE ERROR:", error.message);
        res.status(500).json({ 
            error: "Connection Error", 
            details: error.message,
            hint: "If you see 'socket disconnected', the proxy is rejecting Render." 
        });
    }
});

app.get('/', (req, res) => res.send("Engine Online."));
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Port ${PORT} Active`));
