// api/withdraw.js - API для заявок на вывод
let withdrawRequests = [];

export default function handler(req, res) {
  const { method, body } = req;
  
  if (method === 'POST') {
    const { action } = body;
    
    try {
      switch(action) {
        case 'addRequest':
          const request = {
            id: Date.now().toString(),
            userId: body.userId,
            username: body.username,
            itemName: body.itemName,
            itemImage: body.itemImage,
            itemPrice: body.itemPrice,
            timestamp: Date.now(),
            status: 'pending',
            processed: false,
            userTelegramId: body.userTelegramId
          };
          withdrawRequests.unshift(request);
          return res.status(200).json({ success: true, request });
          
        case 'getRequests':
          return res.status(200).json({ 
            success: true, 
            requests: withdrawRequests 
          });
          
        case 'completeRequest':
          const requestId = body.requestId;
          const reqIndex = withdrawRequests.findIndex(r => r.id === requestId);
          if (reqIndex !== -1) {
            withdrawRequests[reqIndex].status = 'completed';
            withdrawRequests[reqIndex].processed = true;
            withdrawRequests[reqIndex].processedAt = Date.now();
            return res.status(200).json({ success: true });
          }
          return res.status(404).json({ success: false, error: 'Request not found' });
          
        case 'clearAll':
          withdrawRequests = [];
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