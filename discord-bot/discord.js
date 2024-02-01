// All Codes are created by Nexem
const { Client, GatewayIntentBits } = require('discord.js');
const { token } = require('./db/token.json');
const { guild_id } = require('./db/guild_id.json');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
  ],
});

function calculateReward(blueGemLocks, diamondLocks, worldLocks) {
    return blueGemLocks * 100 + diamondLocks * 50 + worldLocks * 10;
}

//HandleLeaderboard
async function handleLeaderboard(interaction) {
    const channelId = interaction.channelId;

    if (channelId !== '1201804657492770816') {
        return interaction.reply('This command is only available on a #commands channel.');
    }

    const leaderboardEndTimeData = fs.readFileSync('./db/leaderboardEndTime.json', 'utf8');
    const { endTimestamp } = JSON.parse(leaderboardEndTimeData);

    const remainingTime = Math.max(0, endTimestamp - Date.now());

    const remainingDays = Math.floor(remainingTime / (24 * 60 * 60 * 1000));
    const remainingHours = Math.floor((remainingTime % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const remainingMinutes = Math.floor((remainingTime % (60 * 60 * 1000)) / (60 * 1000));

    const usersDir = './db/users/';
    const existingUsers = fs.readdirSync(usersDir);

    const blueGemLockRatio = 10000;
    const diamondLockRatio = 100;
    const worldLockRatio = 1;

    let sortedUsers;

    if (remainingTime <= 0) {
        sortedUsers = existingUsers
            .map((user) => {
                const userDataPath = usersDir + user;
                const userData = JSON.parse(fs.readFileSync(userDataPath, 'utf8'));

                const blueGemLocks = Math.floor(userData.balance / blueGemLockRatio);
                const remainingBalanceAfterBlueGemLocks = userData.balance % blueGemLockRatio;

                const diamondLocks = Math.floor(remainingBalanceAfterBlueGemLocks / diamondLockRatio);
                const remainingBalanceAfterDiamondLocks = remainingBalanceAfterBlueGemLocks % diamondLockRatio;

                const worldLocks = Math.floor(remainingBalanceAfterDiamondLocks / worldLockRatio);

                const username = user.replace('.json', '');

                const rewardAmount = calculateReward(blueGemLocks, diamondLocks, worldLocks);
                userData.balance += rewardAmount;

                fs.writeFileSync(`./db/users/${user}`, JSON.stringify(userData, null, 2), 'utf8');

                return {
                    username,
                    blueGemLocks,
                    diamondLocks,
                    worldLocks,
                    rewardAmount,
                };
            })
            .sort((a, b) => b.blueGemLocks - a.blueGemLocks || b.diamondLocks - a.diamondLocks || b.worldLocks - a.worldLocks)
            .slice(0, 20);

        const leaderboardDuration = 7 * 24 * 60 * 60 * 1000;
        const newLeaderboardEndTime = Date.now() + leaderboardDuration;
        fs.writeFileSync('./db/leaderboardEndTime.json', JSON.stringify({ endTimestamp: newLeaderboardEndTime }));

        const rewardDetails = sortedUsers.map((user) => {
            return `**${user.username}** earned ${user.rewardAmount} Locks: <:bluegemlock:1202218611373248542> ${user.blueGemLocks} Blue Gem Locks, <:diamondlock:1202218639030493204> ${user.diamondLocks} Diamond Locks, <:worldlock:1202201299043745815> ${user.worldLocks} World Locks`;
        }).join('\n');

        const rewardChannelId = 'REWARD_CHANNEL_ID';
        const rewardChannel = interaction.guild.channels.cache.get(rewardChannelId);
        if (rewardChannel) {
            rewardChannel.send(`Lock Distribution Report:\n\n${rewardDetails}`);
        }
    }

    // Creating the leaderboard message
    const leaderboardMessage = sortedUsers
        .map((user, index) => {
            const blueGemEmoji = '<:bluegemlock:YOUR_EMOJI_ID>';
            const diamondEmoji = '<:diamondlock:YOUR_EMOJI_ID>';
            const worldLockEmoji = '<:worldlock:YOUR_EMOJI_ID>';

            return `:arrow_forward: ${index + 1}. **${user.username}**: ${blueGemEmoji} **${user.blueGemLocks} Blue Gem Locks**, ${diamondEmoji} **${user.diamondLocks} Diamond Locks**, ${worldLockEmoji} **${user.worldLocks} World Locks**`;
        })
        .join('\n');

    interaction.reply(`<:trophy1:1202231340586508328> **Top 20 Leaderboard**:\n\nRemaining time: ${remainingDays} Days, ${remainingHours} Hours, ${remainingMinutes} Minutes\n\n${leaderboardMessage}`);
}

let loggedInUsers = loadLoggedInUsers();
let resetPasswordRequests = new Map();

const leaderboardDuration = 7 * 24 * 60 * 60 * 1000;
let leaderboardEndTime = loadLeaderboardEndTime();

const rewardDistributionInterval = setInterval(() => {
    const remainingTime = Math.max(0, leaderboardEndTime - Date.now());

    const remainingDays = Math.floor(remainingTime / (24 * 60 * 60 * 1000));
    const remainingHours = Math.floor((remainingTime % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const remainingMinutes = Math.floor((remainingTime % (60 * 60 * 1000)) / (60 * 1000));
    if (remainingTime > 0 && remainingTime === leaderboardDuration) {
        distributeRewards();
    }

    if (remainingTime <= 0) {
        clearInterval(rewardDistributionInterval);
    }
}, 60 * 1000);

function calculateReward(blueGemLocks, diamondLocks, worldLocks) {
    return blueGemLocks * 100 + diamondLocks * 50 + worldLocks * 10;
}

function loadLeaderboardEndTime() {
    const leaderboardEndTimeData = fs.readFileSync('./db/leaderboardEndTime.json', 'utf8');
    const { endTimestamp } = JSON.parse(leaderboardEndTimeData);
    return endTimestamp;
}

function saveLeaderboardEndTime() {
    fs.writeFileSync('./db/leaderboardEndTime.json', JSON.stringify({ endTimestamp: leaderboardEndTime }));
}

function loadLoggedInUsers() {
  try {
    const data = fs.readFileSync('./db/loggedInUsers.json', 'utf8');
    return new Map(JSON.parse(data));
  } catch (error) {
    return new Map();
  }
}

function saveLoggedInUsers() {
  fs.writeFileSync('./db/loggedInUsers.json', JSON.stringify(Array.from(loggedInUsers.entries())), 'utf8');
}

async function registerCommands() {
  const commands = await client.guilds.cache.get(guild_id)?.commands.set([
    {
        name: 'register',
        description: 'It Creates a user registration.',
        options: [
          { name: 'user', type: 3, description: 'Your username', required: true },
          { name: 'password', type: 3, description: 'Your password', required: true },
          { name: 'email', type: 3, description: 'Your email address', required: true },
        ],
      },
      {
        name: 'login',
        description: 'It Login to Account.',
        options: [
          { name: 'user', type: 3, description: 'Your User', required: true },
          { name: 'password', type: 3, description: 'Your Password', required: true },
        ],
      },
      {
        name: 'logout',
        description: 'It Logout from Account.',
      },
      {
        name: 'leaderboard',
        description: 'It Shows Top 20 Highest Balanced Peoples.',
      },
      {
        name: 'startleaderboard',
        description: 'It starts leaderboard event.',
      },
      {
        name: 'balance',
        description: 'It Shows account balance.',
      },
      {
          name: 'add',
          description: 'Add currency to a user\'s balance.',
          options: [
              {
                  name: 'user',
                  description: 'The user to add currency to.',
                  type: 3,
                  required: true,
              },
              {
                  name: 'currencytype',
                  description: 'The type of currency to add (wls, dls, bgls).',
                  type: 3,
                  required: true,
                  choices: [
                      { name: 'World Lock', value: 'wl' },
                      { name: 'Diamond Lock', value: 'dl' },
                      { name: 'Blue Gem Lock', value: 'bgl' },
                  ],
              },
              {
                  name: 'amount',
                  description: 'The amount of currency to add.',
                  type: 4,
                  required: true,
              },
          ],
      },      
      {
          name: 'remove',
          description: 'Add currency to a user\'s balance.',
          options: [
              {
                  name: 'user',
                  description: 'The user to add currency to.',
                  type: 3,
                  required: true,
              },
              {
                  name: 'currencytype',
                  description: 'The type of currency to add (wls, dls, bgls).',
                  type: 3,
                  required: true,
                  choices: [
                      { name: 'World Lock', value: 'wl' },
                      { name: 'Diamond Lock', value: 'dl' },
                      { name: 'Blue Gem Lock', value: 'bgl' },
                  ],
              },
              {
                  name: 'amount',
                  description: 'The amount of currency to remove.',
                  type: 4,
                  required: true,
              },
          ],
      }, 
      {
        name: 'transfer',
        description: 'Transfer currency to a user\'s balance.',
        options: [
            {
                name: 'user',
                description: 'The user to transfer currency to.',
                type: 3,
                required: true,
            },
            {
                name: 'currency',
                description: 'The type of currency to transfer (wls, dls, bgls).',
                type: 3,
                required: true,
                choices: [
                    { name: 'World Lock', value: 'wl' },
                    { name: 'Diamond Lock', value: 'dl' },
                    { name: 'Blue Gem Lock', value: 'bgl' },
                ],
            },
            {
                name: 'amount',
                description: 'The amount of currency to transfer.',
                type: 4,
                required: true,
            },
        ],
    },      
  ]);
}

client.once('ready', async () => {
  console.log(`Bot is ready as: ${client.user.tag}!`);
  await registerCommands();
  console.log('Slash commands have been registered.');
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;
  const channelId = interaction.channelId;

  if (commandName === 'register') {
    if (channelId !== '1201801689477435462') {
      return interaction.reply('This command is only available on a #register channel.');
    }

    const user = interaction.options.getString('user').toLowerCase();
    const password = interaction.options.getString('password');
    const email = interaction.options.getString('email').toLowerCase();

    const usersDir = './db/users/';
    const existingUsers = fs.readdirSync(usersDir);

    for (let i = 0; i < existingUsers.length; i++) {
      const existingUser = JSON.parse(fs.readFileSync(usersDir + existingUsers[i], 'utf8'));

      if (existingUser.User.toLowerCase() === user) {
        return interaction.reply('This username is already taken. Please choose another username.');
      }

      if (existingUser.email.toLowerCase() === email) {
        return interaction.reply('This email address is already in use. Please enter another email address.');
      }
    }

//Hashing the password
bcrypt.hash(password, 10, function(err, hash) {
  if (err) {
    console.error(err);
    return interaction.reply('An error occurred while hashing the password.');
  }

  const userData = {
    User: user,
    password: hash,
    email: email,
    discordID: interaction.user.id,
    balance: 0,
    registered: true,
    role: '',
  };

  fs.writeFileSync(`./db/users/${user}.json`, JSON.stringify(userData, null, 2));

  loggedInUsers.set(interaction.user.id, true);
  saveLoggedInUsers();
  console.log(`User ${interaction.user.id} is now logged in.`);
  console.log(`Current loggedInUsers: ${JSON.stringify(Array.from(loggedInUsers.entries()))}`);
  interaction.reply('Registration completed successfully.');
});
  } else {
    if (channelId !== '1201804657492770816') {
      return interaction.reply('This command is only available on a #commands channel.');
    }

if (commandName === 'login') {
    const user = interaction.options.getString('user');
    const password = interaction.options.getString('password');
    const userDataPath = `./db/users/${user}.json`;

    if (fs.existsSync(userDataPath)) {
        const userData = JSON.parse(fs.readFileSync(userDataPath, 'utf8'));
        const result = await bcrypt.compare(password, userData.password);

        if (result) {
            if (loggedInUsers.get(interaction.user.id)) {
                interaction.reply('You are already logged in.');
            } else {
                loggedInUsers.set(interaction.user.id, true);
                saveLoggedInUsers();
                console.log(`User ${interaction.user.id} is now logged in.`);
                console.log(`Current loggedInUsers: ${JSON.stringify(Array.from(loggedInUsers.entries()))}`);
                interaction.reply(`Successfully logged in ${user}.`);
            }
        } else {
            interaction.reply('Incorrect password.');
        }
    } else {
        interaction.reply('User data not found.');
    }
} else if (commandName === 'logout') {
      if (loggedInUsers.get(interaction.user.id)) {
        loggedInUsers.delete(interaction.user.id);
        saveLoggedInUsers();
        interaction.reply('Successfully logged out.');
      } else {
        interaction.reply('You are not currently logged in.');
      }
    }
    if (commandName === 'balance') {
        if (channelId !== '1201804657492770816') {
            return interaction.reply('This command is only available on a #commands channel.');
        }
    
        const loggedInUserId = interaction.user.id;
    
        if (!loggedInUsers.get(loggedInUserId)) {
            return interaction.reply('You need to be logged in to use this command.');
        }
    
        const usersDir = './db/users/';
        const existingUsers = fs.readdirSync(usersDir);
    
        let foundUserData = null;
        let i;
    
        for (i = 0; i < existingUsers.length; i++) {
            const userDataPath = usersDir + existingUsers[i];
            const userData = JSON.parse(fs.readFileSync(userDataPath, 'utf8'));
    
            if (userData.discordID === loggedInUserId) {
                foundUserData = userData;
                break;
            }
        }
    
        if (foundUserData) {
            const blueGemLockRatio = 10000;
            const diamondLockRatio = 100;
            const worldLockRatio = 1;
    
            const blueGemLocks = Math.floor(foundUserData.balance / blueGemLockRatio);
            const remainingBalanceAfterBlueGemLocks = foundUserData.balance % blueGemLockRatio;
    
            const diamondLocks = Math.floor(remainingBalanceAfterBlueGemLocks / diamondLockRatio);
            const remainingBalanceAfterDiamondLocks = remainingBalanceAfterBlueGemLocks % diamondLockRatio;
    
            const worldLocks = remainingBalanceAfterDiamondLocks >= 100 ? Math.floor(remainingBalanceAfterDiamondLocks / worldLockRatio) : remainingBalanceAfterDiamondLocks;
    
            const user = existingUsers[i].replace('.json', '');
            interaction.reply(`You are *${user}*, and you have <:bluegemlock:1202218611373248542> **${blueGemLocks} Blue Gem Locks**, <:diamondlock:1202218639030493204> **${diamondLocks} Diamond Locks**, <:worldlock:1202201299043745815> **${worldLocks} World Locks**!`);
        } else {
            interaction.reply('User data not found.');
        }
    }    
    if (commandName === 'add') {
        try {
            if (channelId !== '1201804657492770816') {
                throw new Error('This command is only available on a #commands channel.');
            }
    
            const loggedInUserId = interaction.user.id;
            if (!loggedInUsers.get(loggedInUserId)) {
                throw new Error('You need to be logged in to use this command.');
            }
    
            const roleId = '1201799268881403955';
            if (!interaction.member.roles.cache.has(roleId)) {
                throw new Error('You do not have the required role to use this command.');
            }
    
            const user = interaction.options.getString('user');
            const amount = interaction.options.getInteger('amount');
    
            const inputCurrencyType = interaction.options.getString('currencytype');

            if (!inputCurrencyType) {
                return interaction.reply('Currency type is missing.');
            }
    
            const userDataPath = `./db/users/${user}.json`;
    
            if (!fs.existsSync(userDataPath)) {
                throw new Error('User data not found. File does not exist.');
            }
    
            let currencyName;
            let multiplier = 1;
            let emoji;
            let emoji_id;
            switch (inputCurrencyType.toLowerCase()) {
                case 'wl':
                    currencyName = 'World Locks';
                    emoji = 'worldlock';
                    emoji_id = 'YOUR_EMOJI_ID';
                    break;
                case 'dl':
                    currencyName = 'Diamond Locks';
                    multiplier = 100;
                    emoji = 'diamondlock';
                    emoji_id = 'YOUR_EMOJI_ID';
                    break;
                case 'bgl':
                    currencyName = 'Blue Gem Locks';
                    multiplier = 10000;
                    emoji = 'bluegemlock';
                    emoji_id = 'YOUR_EMOJI_ID';
                    break;
                default:
                    return interaction.reply('Invalid currency type. Please use "wl", "dl", or "bgl".');
            }
            
            const userData = JSON.parse(fs.readFileSync(userDataPath, 'utf8'));
            
            userData.balance += amount * multiplier;
            
            fs.writeFileSync(userDataPath, JSON.stringify(userData, null, 2), 'utf8');
            
            const formattedAmount = new Intl.NumberFormat().format(userData.balance);
            
            const customEmoji = `<:${emoji}:${emoji_id}>`;
            
            interaction.reply(`Added **${amount} ${customEmoji} ${currencyName}** to *${user}*'s balance. <:check:1202219774747090974> New balance: ${formattedAmount} Wls`);
        } catch (error) {
            interaction.reply(`An error occurred: ${error.message}`);
        }
    }   
    if (commandName === 'remove') {
        try {
            if (channelId !== '1201804657492770816') {
                throw new Error('This command is only available on a #commands channel.');
            }
    
            const loggedInUserId = interaction.user.id;
            if (!loggedInUsers.get(loggedInUserId)) {
                throw new Error('You need to be logged in to use this command.');
            }
    
            const roleId = '1201799268881403955';
            if (!interaction.member.roles.cache.has(roleId)) {
                throw new Error('You do not have the required role to use this command.');
            }
    
            const user = interaction.options.getString('user');
            const amount = interaction.options.getInteger('amount');
    
            const inputCurrencyType = interaction.options.getString('currencytype');

            if (!inputCurrencyType) {
                return interaction.reply('Currency type is missing.');
            }
    
            const userDataPath = `./db/users/${user}.json`;
    
            if (!fs.existsSync(userDataPath)) {
                throw new Error('User data not found. File does not exist.');
            }
    
            let currencyName;
            let multiplier = 1;
            let emoji;
            let emoji_id;
            switch (inputCurrencyType.toLowerCase()) {
                case 'wl':
                    currencyName = 'World Locks';
                    emoji = 'worldlock';
                    emoji_id = 'YOUR_EMOJI_ID';
                    break;
                case 'dl':
                    currencyName = 'Diamond Locks';
                    multiplier = 100;
                    emoji = 'diamondlock';
                    emoji_id = 'YOUR_EMOJI_ID';
                    break;
                case 'bgl':
                    currencyName = 'Blue Gem Locks';
                    multiplier = 10000;
                    emoji = 'bluegemlock';
                    emoji_id = 'YOUR_EMOJI_ID';
                    break;
                default:
                    return interaction.reply('Invalid currency type. Please use "wl", "dl", or "bgl".');
            }
    
            const userData = JSON.parse(fs.readFileSync(userDataPath, 'utf8'));
    
            if (amount * multiplier > userData.balance) {
                return interaction.reply('You cannot remove more than the user has.');
            }
    
            userData.balance -= amount * multiplier;
    
            fs.writeFileSync(userDataPath, JSON.stringify(userData, null, 2), 'utf8');
    
            const formattedAmount = new Intl.NumberFormat().format(userData.balance);

            const customEmoji = `<:${emoji}:${emoji_id}>`;
    
            interaction.reply(`Removed **${amount} ${customEmoji} ${currencyName}** from *${user}*'s balance. <:check:1202219774747090974> New balance: ${formattedAmount} Wls`);
        } catch (error) {
            interaction.reply(`An error occurred: ${error.message}`);
        }
    }
    if (commandName === 'startleaderboard') {
    // Kontrolleri ekleyin
    if (channelId !== 'YOUR_CHANNEL_ID') {
        throw new Error('This command is only available on a #commands channel.');
    }
    
    const loggedInUserId = interaction.user.id;
    if (!loggedInUsers.get(loggedInUserId)) {
        throw new Error('You need to be logged in to use this command.');
    }
    
    const roleId = 'YOUR_CHANNEL_ID';
    if (!interaction.member.roles.cache.has(roleId)) {
        throw new Error('You do not have the required role to use this command.');
    }
    const leaderboardDuration = 7 * 24 * 60 * 60 * 1000;
    
    const endTimestamp = Date.now() + leaderboardDuration;
    
    fs.writeFileSync('./db/leaderboardEndTime.json', JSON.stringify({ endTimestamp }));
    
    interaction.reply(`Leaderboard has started! It will end in 7 days.`);
    }
    if (commandName === 'leaderboard') {
        if (channelId !== '1201804657492770816') {
            return interaction.reply('This command is only available on a #commands channel.');
        }
    
        const leaderboardEndTimeData = fs.readFileSync('./db/leaderboardEndTime.json', 'utf8');
        const { endTimestamp } = JSON.parse(leaderboardEndTimeData);
    
        const remainingTime = Math.max(0, endTimestamp - Date.now());
    
        const remainingDays = Math.floor(remainingTime / (24 * 60 * 60 * 1000));
        const remainingHours = Math.floor((remainingTime % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        const remainingMinutes = Math.floor((remainingTime % (60 * 60 * 1000)) / (60 * 1000));
    
        const usersDir = './db/users/';
        const existingUsers = fs.readdirSync(usersDir);
    
        const blueGemLockRatio = 10000;
        const diamondLockRatio = 100;
        const worldLockRatio = 1;
    
        if (remainingTime <= 0) {
            const sortedUsers = existingUsers
                .map((user) => {
                    const userDataPath = usersDir + user;
                    const userData = JSON.parse(fs.readFileSync(userDataPath, 'utf8'));
        
                    const blueGemLocks = Math.floor(userData.balance / blueGemLockRatio);
                    const remainingBalanceAfterBlueGemLocks = userData.balance % blueGemLockRatio;
        
                    const diamondLocks = Math.floor(remainingBalanceAfterBlueGemLocks / diamondLockRatio);
                    const remainingBalanceAfterDiamondLocks = remainingBalanceAfterBlueGemLocks % diamondLockRatio;
        
                    const worldLocks = Math.floor(remainingBalanceAfterDiamondLocks / worldLockRatio);
        
                    userData.blueGemLocks = blueGemLocks;
                    userData.diamondLocks = diamondLocks;
                    userData.worldLocks = worldLocks;
        
                    return userData;
                })
                .sort((a, b) => b.blueGemLocks - a.blueGemLocks || b.diamondLocks - a.diamondLocks || b.worldLocks - a.worldLocks)
                .slice(0, 20);
        
            //Balance Rewards
            const rewardAmounts = [10000, 5000, 2500];
        
            for (let i = 0; i < Math.min(sortedUsers.length, rewardAmounts.length); i++) {
                const rewardUser = sortedUsers[i];
                const rewardAmount = rewardAmounts[i];
        
                rewardUser.balance += rewardAmount;
        
                fs.writeFileSync(`./db/users/${rewardUser.user}`, JSON.stringify(rewardUser, null, 2), 'utf8');
            }
        
            const leaderboardDuration = 7 * 24 * 60 * 60 * 1000;
            const newLeaderboardEndTime = Date.now() + leaderboardDuration;
            fs.writeFileSync('./db/leaderboardEndTime.json', JSON.stringify({ endTimestamp: newLeaderboardEndTime }));
        }        
    
        const leaderboardMessage = existingUsers
            .map((user) => {
                const userDataPath = usersDir + user;
                const userData = JSON.parse(fs.readFileSync(userDataPath, 'utf8'));
    
                const blueGemLocks = Math.floor(userData.balance / blueGemLockRatio);
                const remainingBalanceAfterBlueGemLocks = userData.balance % blueGemLockRatio;
    
                const diamondLocks = Math.floor(remainingBalanceAfterBlueGemLocks / diamondLockRatio);
                const remainingBalanceAfterDiamondLocks = remainingBalanceAfterBlueGemLocks % diamondLockRatio;
    
                const worldLocks = Math.floor(remainingBalanceAfterDiamondLocks / worldLockRatio);
    
                const username = user.replace('.json', '');
    
                return `:arrow_forward: **${username}**: <:bluegemlock:1202218611373248542> **${blueGemLocks} Blue Gem Locks**, <:diamondlock:1202218639030493204> **${diamondLocks} Diamond Locks**, <:worldlock:1202201299043745815> **${worldLocks} World Locks**`;
            })
            .join('\n');
    
        interaction.reply(`<:trophy1:1202231340586508328> **Top 20 Leaderboard**:\n\nRemaining time: ${remainingDays} Days, ${remainingHours} Hours, ${remainingMinutes} Minutes\n\n${leaderboardMessage}`);
    } else if (commandName === 'transfer') {
        const senderUserId = interaction.user.id;
        const targetUser = interaction.options.getString('user');
        const currency = interaction.options.getString('currency');
        const amount = interaction.options.getInteger('amount');
    
        const senderUserDataPath = `./db/users/${senderUserId}.json`;
        const senderUserData = JSON.parse(fs.readFileSync(senderUserDataPath, 'utf8'));
    
        const targetUserDataPath = `./db/users/${targetUser}.json`;
    
        if (!fs.existsSync(targetUserDataPath)) {
            return interaction.reply('Target user not found.');
        }
    
        const targetUserData = JSON.parse(fs.readFileSync(targetUserDataPath, 'utf8'));
    
        const currencyRatios = {
            wl: 1,
            dl: 100,
            bgl: 10000,
        };
    
        if (!currencyRatios[currency]) {
            return interaction.reply('Invalid currency. Please use wl, dl, or bgl.');
        }
    
        const transferAmount = amount * currencyRatios[currency];
    
        if (senderUserData.balance < transferAmount) {
            return interaction.reply('Insufficient balance.');
        }
    
        senderUserData.balance -= transferAmount;
        targetUserData.balance += transferAmount;
    
        fs.writeFileSync(senderUserDataPath, JSON.stringify(senderUserData, null, 2), 'utf8');
        fs.writeFileSync(targetUserDataPath, JSON.stringify(targetUserData, null, 2), 'utf8');
    
        return interaction.reply(`Transfer successful! ${amount} ${currency} transferred to ${targetUser}.`);
    }   
  }    
});

client.login(token);