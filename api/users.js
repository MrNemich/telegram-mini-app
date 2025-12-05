// api/users.js - API для работы с пользователями
const usersDB = {
  users: {},
  nextUserId: 8000001,
  settings: {
    referralBonus: 50,
    referralCommission: 0.1,
    maxKeyAttempts: 2,
    keyCooldownHours: 24,
    battlePassExpPerCase: 10,
    battlePassRewardPerLevel: 15
  },
  usedKeys: {},
  usedPromoCodes: {},
  adminUsers: ['G7#gQ!j2$Lp9@wRn'],
  version: '2.0'
};

export default function handler(req, res) {
  const { method, body } = req;
  
  if (method === 'POST') {
    const { action, telegramId, userData, referralCode } = body;
    
    try {
      switch(action) {
        case 'getUser':
          const user = usersDB.users[telegramId];
          if (!user) {
            // Создаем нового пользователя
            const newUser = createUser(telegramId, userData, referralCode);
            return res.status(200).json({ success: true, user: newUser });
          }
          return res.status(200).json({ success: true, user });
          
        case 'updateUser':
          if (usersDB.users[telegramId]) {
            usersDB.users[telegramId] = { 
              ...usersDB.users[telegramId], 
              ...body.userData,
              lastActive: Date.now()
            };
            return res.status(200).json({ success: true });
          }
          return res.status(404).json({ success: false, error: 'User not found' });
          
        case 'getAllUsers':
          return res.status(200).json({ 
            success: true, 
            users: Object.values(usersDB.users) 
          });
          
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

function createUser(telegramId, userData, referralCode = null) {
  const userId = usersDB.nextUserId++;
  const newUser = {
    userId,
    telegramId,
    balance: 0,
    inventory: {},
    casesOpened: 0,
    paidCasesOpened: 0,
    lastFreeCase: 0,
    achievements: ['Новичок'],
    level: 1,
    experience: 0,
    username: userData.username || 'Игрок',
    firstName: userData.firstName || 'Игрок',
    isBanned: false,
    tasks: {
      'first_steps': { completed: false, progress: 0, reward: 20 },
      'collector': { completed: false, progress: 0, reward: 40 },
      'fast_start': { completed: false, progress: 0, reward: 25 },
      'rare_hunter': { completed: false, progress: 0, reward: 50 },
      'legend': { completed: false, progress: 0, reward: 60 },
      'saver': { completed: false, progress: 0, reward: 30 }
    },
    usedPromoCodes: [],
    dailyCasesOpened: 0,
    lastDailyReset: Date.now(),
    uniqueItemsCollected: 0,
    registrationDate: Date.now(),
    battlePassLevel: 1,
    battlePassExp: 0,
    referralCode: generateReferralCode(),
    referredBy: referralCode ? findUserByReferralCode(referralCode)?.telegramId : null,
    referrals: [],
    referralEarnings: 0,
    keyActivationAttempts: 0,
    lastKeyAttempt: 0,
    lastActive: Date.now(),
    withdrawnItems: []
  };
  
  usersDB.users[telegramId] = newUser;
  
  // Обработка реферала
  if (referralCode) {
    processReferralRegistration(referralCode, telegramId);
  }
  
  return newUser;
}

function generateReferralCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function findUserByReferralCode(code) {
  return Object.values(usersDB.users).find(user => 
    user.referralCode === code
  );
}

function processReferralRegistration(referralCode, newUserTelegramId) {
  const referrer = findUserByReferralCode(referralCode);
  if (referrer && referrer.telegramId !== newUserTelegramId) {
    referrer.referrals.push(newUserTelegramId);
    referrer.balance += usersDB.settings.referralBonus;
    referrer.referralEarnings += usersDB.settings.referralBonus;
  }
}