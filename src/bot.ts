import { Client, Message, GroupChat } from 'whatsapp-web.js';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

interface AdminConfig {
  adminPhoneNumbers: string[];
  groupChatIds: string[];
  bannedWords: string[];
}

class WhatsAppLinkFilterBot {
  private client: Client;
  private config: AdminConfig;
  private DATA_DIR = './data';
  private CONFIG_FILE_PATH = path.join(this.DATA_DIR, 'config.json');
  private rl: readline.Interface;
  private pairingCodeRequested = false;

  constructor() {
    this.ensureDataDirectory();
    this.config = this.loadConfig();
    this.setupReadlineInterface();
    this.initializeClient();
  }

  private ensureDataDirectory(): void {
    if (!fs.existsSync(this.DATA_DIR)) {
      fs.mkdirSync(this.DATA_DIR, { recursive: true });
      console.log(`✓ Created data directory at ${this.DATA_DIR}`);
    }
  }

  private setupReadlineInterface(): void {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  private loadConfig(): AdminConfig {
    try {
      if (fs.existsSync(this.CONFIG_FILE_PATH)) {
        const data = fs.readFileSync(this.CONFIG_FILE_PATH, 'utf-8');
        const config = JSON.parse(data);
        if (!config.bannedWords) {
          config.bannedWords = [];
          this.saveConfig();
        }
        return config;
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }

    return {
      adminPhoneNumbers: [],
      groupChatIds: [],
      bannedWords: [],
    };
  }

  private saveConfig(): void {
    fs.writeFileSync(
      this.CONFIG_FILE_PATH,
      JSON.stringify(this.config, null, 2)
    );
  }

  private initializeClient(): void {
    this.client = new Client({
      authStrategy: require('whatsapp-web.js').NoAuth,
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
        ],
      },
    });

    this.setupEventListeners();
    this.client.initialize();
  }

  private setupEventListeners(): void {
    this.client.on('loading_screen', (percent: number, message: string) => {
      console.log(`Loading: ${percent}% - ${message}`);
    });

    this.client.on('qr', async (qr: string) => {
      console.log('\n════════════════════════════════════════════════');
      console.log('WhatsApp Pairing Code Authentication');
      console.log('════════════════════════════════════════════════\n');

      try {
        const pairingCode = await this.client.requestPairingCode(
          parseInt(process.env.PAIRING_PHONE_NUMBER || '', 10)
        );

        console.log('📱 Your Pairing Code (valid for 60 seconds):');
        console.log(`\n🔐 ${pairingCode}\n`);
        console.log('Enter this code in WhatsApp:');
        console.log('1. Open WhatsApp on your phone');
        console.log('2. Go to Settings → Linked Devices');
        console.log('3. Select "Link a Device"');
        console.log('4. Choose "Use Phone Number Instead"');
        console.log('5. Enter your phone number');
        console.log('6. Enter the pairing code above');
        console.log('\n════════════════════════════════════════════════\n');

        this.pairingCodeRequested = true;
      } catch (error) {
        console.error('Error requesting pairing code:', error);
        console.log('Falling back to QR code method...');
        console.log('Scan with WhatsApp on your phone:');
        console.log(qr);
      }
    });

    this.client.on('authenticated', () => {
      console.log('\n✓ Successfully authenticated with WhatsApp!');
      console.log('Bot is initializing...\n');
    });

    this.client.on('auth_failure', (msg: string) => {
      console.error('✗ Authentication failed:', msg);
      console.log('Please check your pairing code and try again.');
      this.cleanup();
    });

    this.client.on('ready', () => {
      console.log('════════════════════════════════════════════════');
      console.log('✓ Bot is ready and listening!');
      console.log('════════════════════════════════════════════════\n');
      this.displayBotInfo();
    });

    this.client.on('message', (msg: Message) => this.handleMessage(msg));

    this.client.on('disconnected', (reason: string) => {
      console.error('✗ Client was disconnected:', reason);
      console.log('Attempting to reconnect in 5 seconds...');
      setTimeout(() => {
        this.client.initialize();
      }, 5000);
    });

    this.client.on('error', (error: Error) => {
      console.error('✗ Client error:', error.message);
    });
  }

  private displayBotInfo(): void {
    console.log('📋 Bot Configuration:');
    console.log(`   Admins: ${this.config.adminPhoneNumbers.length || 'None configured'}`);
    console.log(`   Groups: ${this.config.groupChatIds.length || 'Monitoring all groups'}`);
    console.log(
      `   Banned Words: ${this.config.bannedWords.length || 'None configured'}`
    );
    if (this.config.bannedWords.length > 0) {
      console.log(`      [${this.config.bannedWords.join(', ')}]`);
    }
    console.log('\n🔗 Link Detection Active');
    console.log('   • Detects: HTTP(S), FTP, WWW, domain extensions');
    console.log('   • Action: Delete + Warning');
    console.log('   • Exception: Admin messages allowed');
    console.log('\n🚫 Banned Words Detection Active');
    console.log('   • Action: Delete + Warning');
    console.log('   ��� Exception: Admin messages allowed\n');
  }

  private async handleMessage(msg: Message): Promise<void> {
    try {
      const chat = await msg.getChat();

      if (!(chat instanceof GroupChat)) {
        return;
      }

      const isAdmin = await this.isUserAdmin(msg.from, chat);
      const contact = await msg.getContact();
      const userName = contact.name || msg.from;
      const messageText = msg.body.toLowerCase();

      // Check for banned words
      const bannedWordFound = this.getBannedWordInMessage(messageText);
      if (bannedWordFound) {
        await msg.delete(true);
        await chat.sendMessage(
          `@${msg.from.replace('@c.us', '')} ⚠️ The word "${bannedWordFound}" is not allowed in this group.`,
          {
            mentions: [contact],
          }
        );
        console.log(
          `[${chat.name}] Deleted message from ${userName} - Banned word: "${bannedWordFound}"`
        );
        return;
      }

      // Check for links (skip if admin)
      if (this.containsLink(msg.body)) {
        if (!isAdmin) {
          await msg.delete(true);
          await chat.sendMessage(
            `@${msg.from.replace('@c.us', '')} ⚠️ Links are not allowed in this group. Only administrators can share links.`,
            {
              mentions: [contact],
            }
          );
          console.log(`[${chat.name}] Deleted link from ${userName}`);
        }
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  private containsLink(text: string): boolean {
    const urlRegex =
      /(https?:\/\/[^\s]+|www\.[^\s]+|ftp:\/\/[^\s]+|\.[a-z]{2,}\S*)/gi;
    return urlRegex.test(text);
  }

  private getBannedWordInMessage(messageText: string): string | null {
    for (const bannedWord of this.config.bannedWords) {
      const bannedWordLower = bannedWord.toLowerCase();
      const wordBoundaryRegex = new RegExp(`\\b${bannedWordLower}\\b`, 'gi');
      if (wordBoundaryRegex.test(messageText)) {
        return bannedWord;
      }
    }
    return null;
  }

  private async isUserAdmin(
    userJid: string,
    chat: GroupChat
  ): Promise<boolean> {
    try {
      const userPhone = userJid.replace('@c.us', '');
      if (this.config.adminPhoneNumbers.includes(userPhone)) {
        return true;
      }

      const metadata = await chat.getGroupMetadata();
      const participants = metadata.participants.filter((p) => p.isAdmin);

      return participants.some((p) => p.id.user === userPhone);
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  public addAdmin(phoneNumber: string): void {
    if (!this.config.adminPhoneNumbers.includes(phoneNumber)) {
      this.config.adminPhoneNumbers.push(phoneNumber);
      this.saveConfig();
      console.log(`✓ Added ${phoneNumber} as admin`);
    } else {
      console.log(`⚠️  ${phoneNumber} is already an admin`);
    }
  }

  public removeAdmin(phoneNumber: string): void {
    const index = this.config.adminPhoneNumbers.indexOf(phoneNumber);
    if (index > -1) {
      this.config.adminPhoneNumbers.splice(index, 1);
      this.saveConfig();
      console.log(`✓ Removed ${phoneNumber} from admins`);
    } else {
      console.log(`⚠️  ${phoneNumber} is not an admin`);
    }
  }

  public listAdmins(): void {
    if (this.config.adminPhoneNumbers.length === 0) {
      console.log('No admins configured');
      return;
    }
    console.log('Current admins:');
    this.config.adminPhoneNumbers.forEach((admin, index) => {
      console.log(`  ${index + 1}. ${admin}`);
    });
  }

  public addBannedWord(word: string): void {
    const wordLower = word.toLowerCase();
    if (!this.config.bannedWords.includes(wordLower)) {
      this.config.bannedWords.push(wordLower);
      this.saveConfig();
      console.log(`✓ Added "${wordLower}" to banned words`);
    } else {
      console.log(`⚠️  "${wordLower}" is already banned`);
    }
  }

  public removeBannedWord(word: string): void {
    const wordLower = word.toLowerCase();
    const index = this.config.bannedWords.indexOf(wordLower);
    if (index > -1) {
      this.config.bannedWords.splice(index, 1);
      this.saveConfig();
      console.log(`✓ Removed "${wordLower}" from banned words`);
    } else {
      console.log(`⚠️  "${wordLower}" is not in banned words list`);
    }
  }

  public listBannedWords(): void {
    if (this.config.bannedWords.length === 0) {
      console.log('No banned words configured');
      return;
    }
    console.log('Current banned words:');
    this.config.bannedWords.forEach((word, index) => {
      console.log(`  ${index + 1}. "${word}"`);
    });
  }

  public clearBannedWords(): void {
    this.config.bannedWords = [];
    this.saveConfig();
    console.log('✓ Cleared all banned words');
  }

  public getBannedWordsCount(): number {
    return this.config.bannedWords.length;
  }

  private cleanup(): void {
    if (this.rl) {
      this.rl.close();
    }
  }

  public async stop(): Promise<void> {
    this.cleanup();
    await this.client.destroy();
  }
}

const bot = new WhatsAppLinkFilterBot();

process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await bot.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down...');
  await bot.stop();
  process.exit(0);
});

process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);
});

export default bot;