const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs-extra');
const moment = require('moment-timezone');
const config = require('./config');

// Bot Configuration
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './session'
    }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// Store deleted messages
let deletedMessages = new Map();

// Menu Commands
const menu = `
╔══════════════════════════╗
║    🤖 *MBOKA TECH BOT*    ║
║    Version: ${config.BOT_VERSION}    ║
╚══════════════════════════╝

┌─── *📱 BASIC COMMANDS* ───┐
│ ✨ .menu - Show this menu
│ ✨ .ping - Check bot status
│ ✨ .owner - Bot owner info
│ ✨ .time - Current time
└──────────────────────────┘

┌─── *⚡ AUTO FEATURES* ───┐
│ 👁️ Auto View Status
│ ❤️ Auto React Status (${config.STATUS_REACTION})
│ 🛡️ Anti-Delete Messages
│ 📖 Auto Read Messages
│ 💚 Always Online
└─────────────────────────┘

┌─── *👑 OWNER COMMANDS* ───┐
│ 🔄 .restart - Restart bot
│ 📊 .stats - Bot statistics
│ 🖼️ .setimage - Change bot image
└─────────────────────────┘

*🎯 Made with ❤️ by Mbokatech*
`;

// Initialize Bot
async function initializeBot() {
    console.log("\n╔════════════════════════════════╗");
    console.log(`║     ${config.BOT_NAME} v${config.BOT_VERSION}     ║`);
    console.log("║        Starting up...         ║");
    console.log("╚════════════════════════════════╝\n");
    
    console.log("📱 Enter Your WhatsApp Number When Prompted!");
    console.log("💡 Example: 255623553450\n");
}

// Handle QR Code
client.on('qr', (qr) => {
    console.log("\n🔐 SCAN THIS QR CODE WITH WHATSAPP:");
    qrcode.generate(qr, { small: true });
    console.log("\n📱 Steps to Connect:");
    console.log("1. Open WhatsApp on your phone");
    console.log("2. Go to Settings -> Linked Devices");
    console.log("3. Tap 'Link a Device'");
    console.log("4. Scan the QR code above\n");
});

// Handle Authentication
client.on('authenticated', () => {
    console.log("✅ Authentication successful!");
});

// Handle Auth Failure
client.on('auth_failure', (msg) => {
    console.error("❌ Authentication failed:", msg);
});

// Handle Ready Event
client.on('ready', async () => {
    console.log(`\n✅ ${config.BOT_NAME} is ready!`);
    console.log(`🤖 Bot connected successfully!\n`);
    
    // Send welcome message to owner
    const ownerId = `${config.OWNER_NUMBER}@c.us`;
    
    try {
        // Send text message
        await client.sendMessage(ownerId, config.WELCOME_MESSAGE);
        
        // Try to send image if available
        try {
            const media = MessageMedia.fromFilePath('./assets/bot-image.jpg');
            if (media) {
                await client.sendMessage(ownerId, media, { 
                    caption: `🤖 *${config.BOT_NAME}*\n\n✅ Bot is now online and ready to use!\n\nType *.menu* to get started.`
                });
            }
        } catch (imgError) {
            console.log("Image not found, sending text only");
        }
        
        console.log(`📨 Welcome message sent to ${config.OWNER_NUMBER}`);
    } catch (error) {
        console.error("Could not send welcome message:", error);
    }
});

// Auto View and React to Status
client.on('message', async (msg) => {
    try {
        // Auto view status updates
        if (msg.isStatus && config.AUTO_STATUS_VIEW) {
            await msg.read();
            console.log(`👁️ Viewed status from: ${msg.author || msg.from}`);
            
            // Auto react to status
            if (config.AUTO_STATUS_REACT) {
                await msg.react(config.STATUS_REACTION);
                console.log(`❤️ Reacted to status with ${config.STATUS_REACTION}`);
            }
        }
        
        // Auto read all incoming messages
        if (config.AUTO_READ_MESSAGES && !msg.isStatus) {
            await msg.read();
        }
        
        // Always Online - Send presence
        if (config.ALWAYS_ONLINE) {
            await client.sendPresenceAvailable();
        }
        
        // Handle Commands
        if (msg.body.startsWith(config.PREFIX)) {
            const command = msg.body.slice(1).toLowerCase();
            const chat = await msg.getChat();
            
            switch(command) {
                case 'menu':
                    await client.sendMessage(msg.from, menu);
                    break;
                    
                case 'ping':
                    await msg.reply(`🏓 *Pong!*\n\n🤖 Bot: ${config.BOT_NAME}\n⚡ Status: Online\n⏱️ Response: Active`);
                    break;
                    
                case 'owner':
                    await msg.reply(`👑 *Bot Owner*\n\n📞 Number: ${config.OWNER_NUMBER}\n🤖 Bot: ${config.BOT_NAME}\n💻 Version: ${config.BOT_VERSION}`);
                    break;
                    
                case 'time':
                    const time = moment().tz('Africa/Dar_es_Salaam').format('HH:mm:ss');
                    const date = moment().tz('Africa/Dar_es_Salaam').format('DD/MM/YYYY');
                    await msg.reply(`🕐 *Current Time*\n\n📅 Date: ${date}\n⏰ Time: ${time}\n🌍 Timezone: East Africa`);
                    break;
                    
                case 'stats':
                    // Owner only command
                    if (msg.from === `${config.OWNER_NUMBER}@c.us`) {
                        const stats = `📊 *Bot Statistics*\n\n🔄 Uptime: Active\n💬 Messages Processed: ${global.messageCount || 0}\n🗑️ Deleted Messages Tracked: ${deletedMessages.size}\n⚙️ Features: All Active`;
                        await msg.reply(stats);
                    } else {
                        await msg.reply("❌ Only bot owner can use this command!");
                    }
                    break;
                    
                case 'restart':
                    if (msg.from === `${config.OWNER_NUMBER}@c.us`) {
                        await msg.reply("🔄 Restarting bot...");
                        process.exit(0);
                    } else {
                        await msg.reply("❌ Only bot owner can restart the bot!");
                    }
                    break;
                    
                default:
                    await msg.reply(`❌ Unknown command: ${msg.body}\n\nType *.menu* to see available commands`);
            }
        }
        
        // Count messages
        if (!global.messageCount) global.messageCount = 0;
        global.messageCount++;
        
    } catch (error) {
        console.error("Error processing message:", error);
    }
});

// Anti-Delete Feature
if (config.ANTI_DELETE) {
    client.on('message_revoke_everyone', async (after, before) => {
        if (before) {
            const deletedInfo = `⚠️ *Message Deleted*\n\n👤 From: ${before.author || before.from}\n📝 Message: ${before.body || 'Media message'}\n🕐 Time: ${moment().format('HH:mm:ss')}`;
            
            // Send to owner
            const ownerId = `${config.OWNER_NUMBER}@c.us`;
            await client.sendMessage(ownerId, deletedInfo);
            
            // Store in map
            deletedMessages.set(Date.now(), before.body);
            console.log(`🗑️ Deleted message captured from: ${before.author || before.from}`);
        }
    });
}

// Keep connection alive - Always Online
setInterval(async () => {
    if (config.ALWAYS_ONLINE && client) {
        try {
            await client.sendPresenceAvailable();
            console.log("💚 Keeping connection alive...");
        } catch (error) {
            // Silently fail
        }
    }
}, 30000);

// Error handling
client.on('disconnected', (reason) => {
    console.log("❌ Bot disconnected:", reason);
    console.log("🔄 Attempting to reconnect...");
});

// Create assets folder and default image
async function setupAssets() {
    await fs.ensureDir('./assets');
    await fs.ensureDir('./session');
    
    // You can add default image creation here if needed
}

// Start Bot
async function start() {
    await setupAssets();
    await initializeBot();
    
    // Ask for phone number
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    rl.question("\n📱 Enter your WhatsApp number (Example: 255623553450): ", (number) => {
        if (number) {
            config.OWNER_NUMBER = number;
            console.log(`\n✅ Number saved: ${number}`);
            console.log("🤖 Starting bot...\n");
        }
        rl.close();
        client.initialize();
    });
}

// Handle process exit
process.on('SIGINT', async () => {
    console.log("\n🛑 Shutting down bot...");
    await client.destroy();
    process.exit(0);
});

start().catch(console.error);
