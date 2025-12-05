// api/admin.js - Админ API
import usersDB from './users.js';

export default function handler(req, res) {
  const { method, body } = req;
  
  if (method === 'POST') {
    const { action, adminKey } = body;
    
    // Проверка админки
    if (!usersDB.adminUsers.includes(adminKey)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    try {
      switch(action) {
        case 'getAllUsers':
          return res.status(200).json({ 
            success: true, 
            users: Object.values(usersDB.users) 
          });
          
        case 'getUser':
          const userId = body.userId;
          const user = Object.values(usersDB.users).find(u => u.userId === userId);
          if (user) {
            return res.status(200).json({ success: true, user });
          }
          return res.status(404).json({ success: false, error: 'User not found' });
          
        case 'updateBalance':
          const { userId: uid, amount } = body;
          const userToUpdate = Object.values(usersDB.users).find(u => u.userId === uid);
          if (userToUpdate) {
            userToUpdate.balance += amount;
            if (userToUpdate.balance < 0) userToUpdate.balance = 0;
            return res.status(200).json({ success: true, newBalance: userToUpdate.balance });
          }
          return res.status(404).json({ success: false, error: 'User not found' });
          
        case 'banUser':
          const { userId: banUserId } = body;
          const userToBan = Object.values(usersDB.users).find(u => u.userId === banUserId);
          if (userToBan) {
            userToBan.isBanned = true;
            return res.status(200).json({ success: true });
          }
          return res.status(404).json({ success: false, error: 'User not found' });
          
        case 'unbanUser':
          const { userId: unbanUserId } = body;
          const userToUnban = Object.values(usersDB.users).find(u => u.userId === unbanUserId);
          if (userToUnban) {
            userToUnban.isBanned = false;
            return res.status(200).json({ success: true });
          }
          return res.status(404).json({ success: false, error: 'User not found' });
          
        case 'resetUser':
          const { userId: resetUserId } = body;
          const userToReset = Object.values(usersDB.users).find(u => u.userId === resetUserId);
          if (userToReset) {
            userToReset.balance = 100;
            userToReset.inventory = {};
            userToReset.level = 1;
            userToReset.experience = 0;
            userToReset.casesOpened = 0;
            userToReset.paidCasesOpened = 0;
            userToReset.uniqueItemsCollected = 0;
            userToReset.achievements = ['Новичок'];
            userToReset.battlePassLevel = 1;
            userToReset.battlePassExp = 0;
            return res.status(200).json({ success: true });
          }
          return res.status(404).json({ success: false, error: 'User not found' });
          
        case 'resetAllData':
          usersDB.users = {};
          usersDB.nextUserId = 8000001;
          usersDB.usedKeys = {};
          usersDB.usedPromoCodes = {};
          return res.status(200).json({ success: true });
          
        default:
          return res.status(400).json({ success: false, error: 'Invalid action' });
      }
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
  
  res.setHeader('Allow', ['POST']);
  return res.status(405).end(`Method ${method} Not Allowed`);
}