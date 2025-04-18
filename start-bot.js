require('dotenv').config();
const axios = require('axios');
const { exec } = require('child_process');

(async function () {
  try {
    console.log('🚀 Iniciando Ngrok...');
    const ngrokProcess = exec('ngrok http 3000');

    await new Promise(resolve => setTimeout(resolve, 2000));

    const { data } = await axios.get('http://127.0.0.1:4040/api/tunnels');
    const url = data.tunnels.find(t => t.proto === 'https').public_url;
    console.log('🌐 Ngrok iniciado en:', url);

    console.log(`🧠 Copiá este webhook en tu Twilio Sandbox: ${url}/webhook`);
  } catch (err) {
    console.error('❌ Error iniciando Ngrok:', err);
  }
})();
