const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const { Client, GatewayIntentBits } = require('discord.js');
dotenv.config();

const app = express();
app.use(express.json());

app.use(cors({
  origin: 'https://bot-dashboard-frontend.onrender.com', // Allow React app running on localhost:3000
}));

// Initialize the Discord bot client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// Function to convert milliseconds to a human-readable format
const formatUptime = (uptimeMs) => {
  const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((uptimeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((uptimeMs % (1000 * 60)) / 1000);

  let formattedUptime = '';

  if (days > 0) formattedUptime += `${days} days `;
  if (hours > 0) formattedUptime += `${hours} hours `;
  if (minutes > 0) formattedUptime += `${minutes} minutes `;
  formattedUptime += `${seconds} seconds `;

  return formattedUptime;
};

// Route to get bot status
app.get('/status', (req, res) => {
  res.json({
    status: client.user ? 'Bot is online' : 'Bot is offline',
    uptime: formatUptime(client.uptime),
  });
});

// Route to get servers the bot is in
app.get('/servers', (req, res) => {
  const servers = client.guilds.cache.map((guild) => ({
    id: guild.id,
    name: guild.name,
  }));
  res.json(servers);
});

// Route to get channels of a specific server
app.get('/channels/:serverId', (req, res) => {
  const serverId = req.params.serverId;
  const guild = client.guilds.cache.get(serverId);

  if (!guild) {
    return res.status(404).send('Server not found');
  }

  const channels = guild.channels.cache
    .filter((channel) => channel.isTextBased()) // Use isTextBased for better accuracy
    .map((channel) => ({
      id: channel.id,
      name: channel.name,
    }));

  res.json(channels);
});

// Route to fetch messages from a specific channel
app.get('/messages/:channelId', async (req, res) => {
  const channelId = req.params.channelId;
  const channel = client.channels.cache.get(channelId);

  if (!channel || !channel.isTextBased()) {
    return res.status(400).send('Invalid channel');
  }

  try {
    const messages = await channel.messages.fetch({ limit: 100 }); // Fetch up to 100 recent messages
    const messageData = messages.map((msg) => ({
      id: msg.id,
      content: msg.content,
      author: msg.author.username,
      authorAvatar: msg.author.displayAvatarURL(), // Get the author's avatar
      timestamp: msg.createdAt,
    }));
    

    res.json(messageData);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).send('Error fetching messages');
  }
});

// Route to send a message to a channel
app.post('/send-message', async (req, res) => {
  const { channelId, message } = req.body;

  const channel = client.channels.cache.get(channelId);
  if (!channel || !channel.isTextBased()) {
    return res.status(400).send('Invalid channel');
  }

  try {
    await channel.send(message);
    res.send('Message sent');
  } catch (error) {
    res.status(500).send('Error sending message');
  }
});

// Start the bot
client.login(process.env.BOT_TOKEN);

app.listen(5000, () => {
  console.log('Backend server is running on port 5000');
});