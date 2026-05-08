# WhatsApp Link Filter & Banned Words Bot 🤖

A powerful WhatsApp bot that automatically manages group conversations by filtering links and enforcing banned words policies.

## ✨ Features

### 🔗 Link Filtering
- **Automatic Detection**: Identifies HTTP(S), FTP, WWW links, and domain extensions
- **Smart Deletion**: Removes messages containing links sent by non-admins
- **User Warning**: Notifies users when their message is deleted with explanation

### 🚫 Banned Words Enforcement
- **Customizable List**: Add any words you want to ban from group conversations
- **Case-Insensitive**: Catches variations regardless of case
- **Word Boundary Detection**: Prevents false positives (won't catch partial matches)
- **Instant Deletion**: Removes banned word messages immediately
- **User Notification**: Warns the user about the specific banned word

### 👮 Admin Management
- **Multi-Level Admins**: Support for group admins and additional configured admins
- **Admin Bypass**: Admins can share links and use banned words
- **Easy Configuration**: Add/remove admins via simple config file

### 🔐 Security & Authentication
- **Pairing Code Auth**: No QR code scanning needed
- **WhatsApp Official**: Uses WhatsApp Linked Devices feature
- **Session Persistence**: Maintains connection across restarts

### 📊 Monitoring & Logging
- **Detailed Logs**: Track all deleted messages and actions
- **User Identification**: Know who attempted to violate policies
- **Group Tracking**: Monitor activity per group

## 📋 Requirements

- **Node.js** 18+ 
- **npm** 8+
- **WhatsApp Account** (for linked device)
- **Docker** (for Railway deployment)

## 🚀 Installation

### Local Setup

1. **Clone the repository**
```bash
git clone https://github.com/patiep089-oss/Group-Police.git
cd Group-Police
```

2. **Install dependencies**
```bash
npm install
```

3. **Create configuration**
```bash
mkdir -p data
cp config.example.json data/config.json
cp .env.example .env
```

4. **Edit `.env`** with your phone number
```bash
PAIRING_PHONE_NUMBER=1234567890  # Your WhatsApp number
```

5. **Build and run**
```bash
npm run build
npm start
```

## ⚙️ Configuration

### Admin Configuration

Edit `data/config.json`:

```json
{
  "adminPhoneNumbers": [
    "12015551234",
    "441234567890"
  ],
  "groupChatIds": [],
  "bannedWords": ["for sale", "cheap account", "account available", "sale", "for sell", "sell"]
}
```

**Phone Number Format**:
| Country | Example |
|---------|----------|
| USA | `12015551234` |
| UK | `441234567890` |
| India | `919876543210` |
| Canada | `14165551234` |

### Default Banned Words

The bot comes with these commerce-related banned words pre-configured:
- `for sale`
- `cheap account`
- `account available`
- `sale`
- `for sell`
- `sell`

Add more by editing the `bannedWords` array in `data/config.json`

## 🔐 WhatsApp Authentication

### Getting the Pairing Code

1. **Start the bot**:
```bash
npm start
```

2. **Check logs** for pairing code:
```
📱 Your Pairing Code (valid for 60 seconds):

🔐 123-456-789

Enter this code in WhatsApp:
...
```

3. **Link on your phone**:
   - Open **WhatsApp**
   - **Settings** → **Linked Devices** → **Link a Device**
   - Choose **"Use Phone Number Instead"**
   - Enter your phone number
   - Enter the pairing code

4. **Confirm** on your phone ✓

## 🚂 Railway Deployment

### Step 1: Repository is Ready
All files are already in the repo!

### Step 2: Railway Setup

1. Go to [railway.app](https://railway.app)
2. Click **New Project** → **Deploy from GitHub**
3. Select `Group-Police` repository
4. Railway auto-detects Dockerfile

### Step 3: Configure Environment

In Railway Dashboard:
1. **Settings** → **Environment**
2. Add variable:
   - `PAIRING_PHONE_NUMBER` = `1234567890`
3. **Deploy**

### Step 4: Add Volume

1. **Settings** → **Add Volume**
2. **Mount Path**: `/app/data`
3. **Size**: 1GB
4. **Redeploy**

### Step 5: Get Pairing Code

1. **Deployments** → **View Logs**
2. Wait for pairing code to appear
3. Copy the code (valid 60 seconds)
4. Link WhatsApp on your phone

## 🎯 How It Works

### Message Processing Flow

```
User sends message
    ↓
Is it a group message?
    ├─ No → Ignore
    └─ Yes → Continue
    ↓
Check for banned words
    ├─ Found → Delete + Warn
    └─ Not found → Continue
    ↓
Check for links
    ├─ Found + Non-admin → Delete + Warn
    ├─ Found + Admin → Allow
    └─ Not found → Allow
```

### Banned Words Detection

- **Word Boundaries**: `hello` matches "hello" but not "helloworld"
- **Case Insensitive**: `SPAM` matches "spam", "Spam", "SPAM"
- **Regex Pattern**: Uses `\bword\b` for exact matching

## 📊 Monitoring

### View Logs

**Local**:
```bash
npm start
```

**Railway**:
1. Dashboard → Deployments → View Logs
2. Filter by timestamp
3. Search for deletion events

### Log Format

```
[Group Name] Deleted message from User - Banned word: "word"
[Group Name] Deleted link from User
✓ Added phone as admin
✓ Added word to banned words
```

## 🛠️ Troubleshooting

### Pairing Code Not Appearing
- Check `PAIRING_PHONE_NUMBER` is correct
- Ensure phone number has country code
- Try again (codes expire after 60 seconds)

### Bot Not Deleting Messages
- Verify bot is made **admin** in group
- Check `data/config.json` exists
- Restart bot after config changes
- Review logs for errors

### Messages Not Getting Detected
- Check banned word casing in config
- Verify link patterns (must start with http/www/ftp)
- Ensure message is from non-admin user

### Connection Lost
- Bot auto-reconnects in 5 seconds
- Check WhatsApp on linked device is still active
- Verify internet connection

## 📝 Example Configurations

### Basic Setup
```json
{
  "adminPhoneNumbers": ["12015551234"],
  "groupChatIds": [],
  "bannedWords": []
}
```

### Professional Community
```json
{
  "adminPhoneNumbers": ["12015551234", "441234567890", "919876543210"],
  "groupChatIds": [],
  "bannedWords": ["spam", "scam", "adult", "inappropriate"]
}
```

### Family Group
```json
{
  "adminPhoneNumbers": ["12015551234"],
  "groupChatIds": [],
  "bannedWords": ["badword1", "badword2", "offensive"]
}
```

## 🔒 Security & Privacy

⚠️ **Important**:
- Never commit `.env` file
- Keep `data/config.json` secure
- Don't share pairing codes
- Regularly review logs
- Keep dependencies updated

## 📦 File Structure

```
Group-Police/
├── src/
│   └── bot.ts              # Main bot logic
├── dist/                   # Compiled JavaScript (auto-generated)
├── data/                   # Persistent data (auto-generated)
│   └── config.json         # Configuration
├── package.json
├── tsconfig.json
├── Dockerfile
├── railway.json
├── .env                    # Environment variables (don't commit)
├── .env.example            # Template
├── .gitignore
├── .dockerignore
└── README.md
```

## 💰 Costs

### Local Hosting
- **Free**: Just your computer + electricity

### Railway Hosting
- **Free Tier**: $5/month credit (covers ~10 days 24/7)
- **Pro**: $5/month subscription (unlimited 24/7)
- **Storage**: $5/month for extra 1GB (usually not needed)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📜 License

MIT License - see LICENSE file for details

## ⚠️ Disclaimer

This project is for educational and group management purposes. Use responsibly and in compliance with WhatsApp's Terms of Service. Always inform group members about moderation policies.

## 🆘 Support

- **Issues**: Open a GitHub issue
- **Questions**: Create a discussion
- **Bugs**: Include logs and error messages

## 🙏 Acknowledgments

- [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) - WhatsApp Web API
- [Railway](https://railway.app) - Hosting platform
- [Node.js](https://nodejs.org) - Runtime environment

---

**Made with ❤️ for better group management**