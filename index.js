const { readFile, writeFile } = require('fs').promises;
const { Client} = require('fnbr');

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

  client.setStatus('invite me if you need a taxi');
  client.on('party:invite', async (party) => {
    if (client.party.leader.id !== client.user.id) {
      await party.decline();
    } else {
      await party.accept();
      client.setStatus('serving another customer');
      client.party.sendMessage('Hello, I am penny Taxi bot. You have 2 minutes to select a mission.');
      client.party.sendMessage('join penny discord server:https://discord.gg/csWdMm9bZP.');
      
      setTimeout(() => {
        client.party.sendMessage('it was my plusure serving you.');
      }, 119000);

      setTimeout(() => {
        client.leaveParty();
        client.setStatus('invite me if you need a taxi');
      }, 120000);
    }
  });
})();
