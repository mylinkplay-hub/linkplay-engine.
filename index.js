const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { HttpsProxyAgent } = require('https-proxy-agent'); 

const app = express();
app.use(cors());
app.use(express.json());

// Render uses dynamic ports, so this allows Render to assign the correct one
const PORT = process.env.PORT || 7860;

// 🛡️ MOBILE PROXY SETUP
const PROXY_URL = process.env.MOBILE_PROXY;
let agent = null;
if (PROXY_URL) {
    agent = new HttpsProxyAgent(PROXY_URL);
    console.log("🛡️ SUCCESS: Mobile Proxy Agent Loaded from Secrets!");
} else {
    console.log("⚠️ WARNING: MOBILE_PROXY secret is missing! Server will run naked.");
}

// 🧠 THE MEMORY BANK 
let currentCookieString = "ndus=YykMPXPpeHui9Lia6lhKJG1XXFqWaojJS913RSsx;"; 
const SECRET_PIN = "Linkplay2026"; 

app.post('/update-cookie', (req, res) => {
    const { pin, newCookie } = req.body;
    if (pin !== SECRET_PIN) return res.status(403).json({ error: "Access Denied." });
    if (!newCookie) return res.status(400).json({ error: "Missing new cookie." });

    currentCookieString = newCookie;
    console.log("🔥 BOOM! Full Cookie Package received from Termux.");
    res.json({ success: true, message: "Cookie updated successfully!" });
});

app.post('/getlink', async (req, res) => {
    let { url } = req.body;
    if (!url) return res.status(400).json({ error: "Missing URL" });

    console.log(`\n========================================`);
    console.log(`🎯 NEW REQUEST FROM WEBSITE: ${url}`);
    
    try {
        const urlObj = new URL(url);
        const safeHostname = 'www.1024terabox.com';
        const targetUrl = url.replace(urlObj.hostname, safeHostname);
        
        console.log(`📡 Sending request to Terabox via Mobile Proxy...`);
        
        const requestOptions = {
            timeout: 15000, // ⏱️ STRICT 15 SECOND TIMEOUT
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
                'Cookie': currentCookieString, 
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Referer': `https://${safeHostname}/`
            }
        };

        if (agent) requestOptions.httpsAgent = agent;

        const response = await axios.get(targetUrl, requestOptions);
        const html = response.data;
        
        console.log(`📦 Terabox responded! Page size: ${html.length} chars.`);

        if (html.includes("Just a moment") || html.includes("cloudflare")) {
            console.log("❌ FATAL: Cloudflare blocked the request.");
        } else if (html.includes("login-btn") || html.includes("account-login")) {
            console.log("❌ FATAL: Terabox forced a login screen.");
        }

        const titleMatch = html.match(/<title>(.*?)<\/title>/);
        let fileName = titleMatch ? titleMatch[1].split(' - ')[0] : "Video_File.mp4";

        const universalLinkMatch = html.match(/https:\/\/[a-zA-Z0-9.-]+\.download\.terabox\.com\/[^\s"'>]+/g) || 
                                   html.match(/https:\\\/\\\/[a-zA-Z0-9.-]+\.download\.terabox\.com\\\/[^\s"'>]+/g);
        const dlinkMatch = html.match(/\"dlink\":\"(.*?)\"/) || html.match(/\"download_url\":\"(.*?)\"/);

        let finalDlink = "";
        if (universalLinkMatch) finalDlink = universalLinkMatch[0].replace(/\\/g, '');
        else if (dlinkMatch) finalDlink = dlinkMatch[1].replace(/\\/g, '');

        if (finalDlink) {
            console.log("🎉 SUCCESS: Video Link Extracted!");
            return res.json({ success: true, name: fileName, dlink: finalDlink });
        }

        console.log("⚠️ ERROR: No links found.");
        res.status(404).json({ error: "Link not found or blocked." });

    } catch (error) {
        console.error("💥 AXIOS ERROR:", error.message);
        res.status(500).json({ error: "Proxy slow or server error. Try again." });
    }
});

app.get('/', (req, res) => res.send("Engine Active."));
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server active on port ${PORT}`));
