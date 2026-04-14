const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { HttpsProxyAgent } = require('https-proxy-agent');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;
const PROXY_URL = process.env.MOBILE_PROXY; 
const SECRET_PIN = "Linkplay2026";

let currentCookieString = "";
let agent = PROXY_URL ? new HttpsProxyAgent(PROXY_URL) : null;

app.post('/update-cookie', (req, res) => {
    const { pin, newCookie } = req.body;
    if (pin !== SECRET_PIN) return res.status(403).json({ error: "Access Denied." });
    currentCookieString = newCookie;
    console.log("🔥 Cookie Updated.");
    res.json({ success: true, message: "Cookie updated successfully!" });
});

app.post('/getlink', async (req, res) => {
    let { url } = req.body;
    if (!url) return res.status(400).json({ error: "Missing URL" });

    try {
        // 🧪 TEST 1: Check if the proxy can reach a simple IP checker
        console.log("🔍 Testing Proxy Connection...");
        try {
            const ipCheck = await axios.get('https://api.ipify.org?format=json', { 
                httpsAgent: agent, 
                timeout: 10000 
            });
            console.log(`📡 Proxy IP confirmed: ${ipCheck.data.ip}`);
        } catch (e) {
            console.log("❌ PROXY DIED: Proxy cannot even reach ipify. Check your DataImpulse balance/link.");
            return res.status(502).json({ error: "Proxy is down or credentials wrong." });
        }

        const targetUrl = url.replace(new URL(url).hostname, 'www.1024terabox.com');
        
        console.log(`📡 Fetching Terabox: ${targetUrl}`);
        const response = await axios.get(targetUrl, {
            timeout: 60000, // ⏳ Full 60 seconds
            httpsAgent: agent,
            headers: { 
                'Cookie': currentCookieString, 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': '*/*',
                'Connection': 'keep-alive'
            }
        });

        const html = response.data;
        const dlinkMatch = html.match(/\"dlink\":\"(.*?)\"/) || html.match(/\"download_url\":\"(.*?)\"/);
        
        if (dlinkMatch) {
            console.log("✅ SUCCESS!");
            return res.json({ success: true, dlink: dlinkMatch[1].replace(/\\/g, '') });
        }
        
        res.status(404).json({ error: "Link not found in HTML", size: html.length });

    } catch (error) {
        console.error("💥 ERROR:", error.message);
        res.status(500).json({ error: "Fetch Failed", details: error.message });
    }
});

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Port ${PORT} Live`));
