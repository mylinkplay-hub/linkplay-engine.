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
    console.log("🔥 RENDER: New Cookie Injected.");
    res.json({ success: true, message: "Cookie updated!" });
});

app.post('/getlink', async (req, res) => {
    let { url } = req.body;
    if (!url) return res.status(400).json({ error: "Missing URL" });

    try {
        // 🚨 THE FIX: Swapping to the lower-security mobile domain
        const targetUrl = url.replace(new URL(url).hostname, 'www.teraboxapp.com');
        
        const reqHeaders = { 
            'Cookie': currentCookieString, 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Referer': 'https://www.teraboxapp.com/'
        };

        let html = "";
        let connectionType = "Proxy";

        // 🥊 ROUND 1: Try with Proxy
        try {
            console.log(`📡 Fetching ${targetUrl} with Proxy...`);
            const response = await axios.get(targetUrl, {
                timeout: 45000, 
                httpsAgent: agent,
                headers: reqHeaders
            });
            html = response.data;
        } catch (proxyErr) {
            // 🥊 ROUND 2: Proxy failed. Try NAKED Render IP.
            console.log(`⚠️ Proxy Failed (${proxyErr.message}). Retrying NAKED...`);
            connectionType = "Naked (Render IP)";
            
            const fallbackResponse = await axios.get(targetUrl, {
                timeout: 45000,
                headers: reqHeaders
            });
            html = fallbackResponse.data;
        }

        // 🎯 EXTRACT LINK
        const dlinkMatch = html.match(/\"dlink\":\"(.*?)\"/) || html.match(/\"download_url\":\"(.*?)\"/);
        
        if (dlinkMatch) {
            console.log(`✅ SUCCESS via ${connectionType}!`);
            return res.json({ 
                success: true, 
                dlink: dlinkMatch[1].replace(/\\/g, ''),
                method: connectionType
            });
        }
        
        // ❌ FAILED TO FIND LINK
        const titleMatch = html.match(/<title>(.*?)<\/title>/);
        const title = titleMatch ? titleMatch[1] : "Unknown Title";
        console.log(`❌ No link found. Page: ${title}`);
        res.status(404).json({ error: "No link found", page_title: title, method_used: connectionType });

    } catch (error) {
        console.error("💥 TOTAL CRASH:", error.message);
        res.status(500).json({ error: "Total Crash", details: error.message });
    }
});

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Engine Live`));
