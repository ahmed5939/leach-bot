const { readFile, writeFile } = require('fs').promises;
const { Client } = require('fnbr');
let queue = [];


(async () => {

  const config = JSON.parse(await readFile('./config.json'));
  

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
  client.setStatus(config.idle_stuats);

  // set the skin and backpack
  client.party.me.setOutfit('CID_A_069_Athena_Commando_M_Accumulate');
  client.party.me.setBackpack('BID_878_BistroSpooky_VPF4T');

  



  let warnTimeout;
  let leaveTimeout;

  function busy() {
    client.setStatus(config.busy_stuats);
    
    welcomeTimeout = setTimeout(() => {
      client.party.sendMessage(config.join_message);
    }, 2000);
    
    warnTimeout= setTimeout(() => {
      client.party.sendMessage(config.leave_message);
    }, config.time_before_leave*60000);
  
    leaveTimeout = setTimeout(async () => {
      if (queue.length > 1) {
        try {
          await client.joinParty(queue[0]);
          queue.shift();
          busy();
        } catch (error) {
          console.log(error);
          queue.shift();
          client.clearTimeout(warnTimeout);
          client.clearTimeout(leaveTimeout);
        }
      }  else {
        client.leaveParty();
        client.setStatus(config.idle_stuats);
        
        
      }
    }, config.time_before_leave * 60000 + 1000);
  }

  



  client.on('friend:request', async (friend) => {
    console.log(`Received friend request from ${friend.displayName}`);

    try {

      await friend.accept();
      console.log(`Accepted friend request from ${friend.displayName}`);

     
    } catch (e) {
      console.error(`Error processing friend request from ${friend.displayName}: ${e}`);
    }
  });
  

  client.on('party:invite', async (party) => {
    try {

      console.log(`Received party invite from ${party.party.leader.displayName}`);
  
      if (client.party.leader.id !== client.user.id) {
        // Check if the party leader is already in the queue
        if (queue.includes(party.party.id)) {
          console.log(`${party.party.leader.displayName} is already in the queue`);
          console.log(queue);
          await party.decline();
      
        } else {
          queue.push(party.party.id);
          await client.sendFriendMessage(party.party.leader.id, "the bot is busy, you have been added to the queue");
          console.log(`Added ${party.party.leader.displayName} to the queue`);
        }
      } else {
        await party.accept();
        busy();
        console.log(`Joined party with ${party.party.leader.displayName}`);
      }
    } catch (error) {
      console.error(`Error handling party invite: ${error}`);
    }
  });
  

  client.on('party:member:kicked', async (party) => {
    console.log(`Kicked from party with ${party.party.leader.displayName}`);
    try {
      if (party.id === client.user.id && queue.length > 0) {
        client.clearTimeout(warnTimeout);
        client.clearTimeout(leaveTimeout);
        try {
          await client.joinParty(queue[0]);
          queue.shift();
          busy();
        } catch (error) {
          console.log(error);
          queue.shift();
          client.clearTimeout(warnTimeout);
          client.clearTimeout(leaveTimeout);
        }
      
      } else if (party.id === client.user.id) {
        client.setStatus(config.idle_stuats);
        client.clearTimeout(warnTimeout);
        client.clearTimeout(leaveTimeout);
      }
    } catch (error) {
      console.error(`Error handling 'party:member:kicked' event: ${error}`);
    }
  });
  

    

  client.on('party:member:left', async (party) => {
    try {
      if (party.party.leader.id === client.user.id && queue.length > 0) {
        // Join the next person in the queue
        client.clearTimeout(warnTimeout);
        client.clearTimeout(leaveTimeout);
        try {
          await client.joinParty(queue[0]);
          queue.shift();
          busy();
        } catch (error) {
          console.log(error);
          queue.shift();
          client.clearTimeout(warnTimeout);
          client.clearTimeout(leaveTimeout);
        }
      } else if (party.party.leader.id === client.user.id && queue.length === 0) {
        // Last person in the party left, set status to idle and leave the party
        client.setStatus(config.idle_stuats);
        client.clearTimeout(warnTimeout);
        client.clearTimeout(leaveTimeout);
        await client.leaveParty();
      } else {
        // Remove the person who left from the queue
        const index = queue.indexOf(party.party.id);
        if (index !== -1) {
          queue.splice(index, 1);
        }
      }
    } catch (error) {
      console.error(`Error handling 'party:member:left' event: ${error}`);
    }
  });
  
  
})();
