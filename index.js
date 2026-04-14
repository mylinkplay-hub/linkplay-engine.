const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { HttpsProxyAgent } = require('https-proxy-agent');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;
const PROXY_URL = process.env.MOBILE_PROXY; // Set this in Render Environment Variables
const SECRET_PIN = "Linkplay2026";

let currentCookieString = "ndus=YykMPXPpeHui9Lia6lhKJG1XXFqWaojJS913RSsx;";
let agent = PROXY_URL ? new HttpsProxyAgent(PROXY_URL) : null;

if (agent) {
    console.log("🛡️ SUCCESS: Mobile Proxy Agent Loaded!");
} else {
    console.log("⚠️ WARNING: MOBILE_PROXY secret is missing! Server will run naked.");
}

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

    try {
        const targetUrl = url.replace(new URL(url).hostname, 'www.1024terabox.com');
        const options = {
            timeout: 30000,
            headers: { 
                'Cookie': currentCookieString, 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36' 
            }
        };

        if (agent) {
            console.log("🛡️ Attempting connection via Proxy...");
            options.httpsAgent = agent;
        }

        const response = await axios.get(targetUrl, options);
        // ... (rest of the link extraction code)

    } catch (error) {
        // 🚨 BETTER ERROR MESSAGES
        if (error.code === 'ECONNRESET' || error.message.includes('TLS')) {
            return res.status(500).json({ error: "Proxy Connection Failed. Check your MOBILE_PROXY settings in Render." });
        }
        res.status(500).json({ error: "Axios Error: " + error.message });
    }
});


app.get('/', (req, res) => res.send("🚀 Engine Active."));
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server active on port ${PORT}`));
