const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const readline = require('readline');

// Simple config
let OWNER_NUMBER = "";
const PREFIX = ".";

// Create client with better settings
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: "mboka-bot",
        dataPath: "./session"
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu'
        ]
    }
});

// Ask for phone number before starting
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log("\n╔════════════════════════════════╗");
console.log("║     MBOKA TECH BOT v2.0       ║");
console.log("║        Starting up...         ║");
console.log("╚════════════════════════════════╝\n");

rl.question("📱 Enter your WhatsApp number (Example: 255623553450): ", (number) => {
    if (number) {
        OWNER_NUMBER = number;
        console.log(`\n✅ Number set: ${OWNER_NUMBER}`);
        console.log("🤖 Initializing bot...\n");
        console.log("⚠️  Wait for QR code to appear...\n");
        rl.close();
        client.initialize();
    } else {
        console.log("❌ Please enter a valid number!");
        rl.close();
        process.exit(1);
    }
});

// QR Code handler
client.on('qr', (qr) => {
    console.log("\n🔐 SCAN THIS QR CODE WITH WHATSAPP:");
    console.log("=" .repeat(50));
    qrcode.generate(qr, { small: true });
    console.log("=" .repeat(50));
    console.log("\n📱 STEPS:");
    console.log("1. Open WhatsApp on your phone");
    console.log("2. Tap Menu (3 dots) or Settings");
    console.log("3. Select 'Linked Devices'");
    console.log("4. Tap 'Link a Device'");
    console.log("5. Scan the QR code above\n");
});

// Ready event
client.on('ready', async () => {
    console.log("\n✅ BOT IS ONLINE AND READY!");
    console.log(`🤖 ${OWNER_NUMBER}\n`);
    
    // Send welcome message
    const chatId = `${OWNER_NUMBER}@c.us`;
    const welcomeMsg = `✅ *MBOKA TECH BOT CONNECTED!*\n\n🤖 *Bot Features:*\n• Auto View Status\n• Auto React Status 🔥\n• Always Online 💚\n• Anti-Delete Messages 🛡️\n• Auto Read Messages\n\n📝 Type *.menu* to see all commands\n\n*Powered by Mbokatech*`;
    
    try {
        await client.sendMessage(chatId, welcomeMsg);
        console.log("✅ Welcome message sent to your WhatsApp!");
    } catch (err) {
        console.log("⚠️  Could not send welcome message:", err.message);
    }
});

// Auto view status and reactions
client.on('message', async (msg) => {
    try {
        // Auto view status
        if (msg.isStatus) {
            await msg.read();
            console.log(`👁️ Viewed status`);
            await msg.react('🔥');
            console.log(`❤️ Reacted with 🔥`);
        }
        
        // Auto read normal messages
        if (!msg.isStatus && msg.from !== 'status@broadcast') {
            await msg.read();
        }
        
        // Command handler
        if (msg.body.startsWith(PREFIX)) {
            const command = msg.body.slice(1).toLowerCase();
            const chatId = msg.from;
            
            // Menu command
            if (command === 'menu') {
                const menuText = `╔══════════════════════════╗
║    🤖 *MBOKA TECH BOT*    ║
║        Version: 2.0       ║
╚══════════════════════════╝

┌─── *📱 COMMANDS* ───┐
│ ✨ .menu - Show menu
│ ✨ .ping - Bot status  
│ ✨ .owner - Bot owner
│ ✨ .time - Current time
└────────────────────┘

┌─── *⚡ AUTO FEATURES* ───┐
│ 👁️ Auto View Status
│ ❤️ Auto React Status (🔥)
│ 🛡️ Anti-Delete
│ 📖 Auto Read Messages
│ 💚 Always Online
└───────────────────────┘

🎯 *Made by Mbokatech*`;
                
                await client.sendMessage(chatId, menuText);
            }
            
            // Ping command
            else if (command === 'ping') {
                await client.sendMessage(chatId, '🏓 *Pong!*\n\n🤖 Bot is online and active!');
            }
            
            // Owner command
            else if (command === 'owner') {
                await client.sendMessage(chatId, `👑 *Bot Owner*\n\n📞 Number: ${OWNER_NUMBER}\n🤖 Bot: MBOKA TECH BOT\n⚡ Status: Active`);
            }
            
            // Time command
            else if (command === 'time') {
                const now = new Date();
                const time = now.toLocaleTimeString('en-US', { hour12: false });
                const date = now.toLocaleDateString();
                await client.sendMessage(chatId, `🕐 *Current Time*\n\n📅 Date: ${date}\n⏰ Time: ${time}\n🌍 UTC+3 (East Africa)`);
            }
            
            // Unknown command
            else {
                await client.sendMessage(chatId, `❌ Unknown command: ${msg.body}\n\nType *.menu* to see available commands`);
            }
        }
        
        // Keep online status
        await client.sendPresenceAvailable();
        
    } catch (error) {
        console.log("Error in message handler:", error.message);
    }
});

// Anti-delete feature
client.on('message_revoke_everyone', async (after, before) => {
    if (before && before.body) {
        console.log(`🗑️ Deleted message detected`);
        const chatId = `${OWNER_NUMBER}@c.us`;
        const deletedMsg = `⚠️ *MESSAGE DELETED*\n\n✏️ Message: ${before.body}\n🕐 Time: ${new Date().toLocaleTimeString()}`;
        
        try {
            await client.sendMessage(chatId, deletedMsg);
        } catch (err) {
            console.log("Could not send deleted message notification");
        }
    }
});

// Keep alive - Always online
setInterval(async () => {
    try {
        await client.sendPresenceAvailable();
        console.log("💚 Heartbeat sent - Keeping online");
    } catch (err) {
        // Silent fail
    }
}, 25000); // Every 25 seconds

// Error handling
client.on('auth_failure', (msg) => {
    console.log("❌ Authentication failed:", msg);
    console.log("🔄 Restart the bot to get a new QR code");
});

client.on('disconnected', (reason) => {
    console.log("❌ Bot disconnected:", reason);
    console.log("🔄 Please restart the bot");
});

// Process handlers
process.on('unhandledRejection', (error) => {
    console.log("Unhandled rejection:", error.message);
});

console.log("🤖 Bot is starting... Please wait...");
