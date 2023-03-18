const { readFile, writeFile } = require('fs').promises;
const { Client} = require('fnbr');
const config = JSON.parse(await readFile('./config.json'));



(async () => {
  
  let auth;
  try {
    auth = { deviceAuth: JSON.parse(await readFile('./deviceAuth.json')) };
  } catch (e) {
    auth = { authorizationCode: async () => Client.consoleQuestion('Please enter an authorization code: ') };
  }

  const client = new Client({ auth });

  client.on('deviceauth:created', (da) => writeFile('./deviceAuth.json', JSON.stringify(da, null, 2)));

  await client.login();
  console.log(`Logged in as ${client.user.displayName}`);

  client.on('friend:request', async (friend) => {
    await friend.accept();
    console.log(`Accepted friend request from ${friend.displayName}`);
  });

  client.setStatus(config.idle_stuats);
  client.on('party:invite', async (party) => {
    if (client.party.leader.id !== client.user.id) {
      await party.decline();
    } else {
      await party.accept();
      client.setStatus(config.busy_stuats);
      client.party.sendMessage(config.join_message);
      // client.party.sendMessage('join penny discord server:https://discord.gg/csWdMm9bZP.');
      
      setTimeout(() => {
        client.party.sendMessage(config.leave_message);
      }, config.time_before_leave*60000);

      setTimeout(() => {
        client.leaveParty();
        client.setStatus(config.idle_stuats);
      }, config.time_before_leave*60000+10000);
    }
  });
})();
