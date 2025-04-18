const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const twilio = require('twilio');
require('dotenv').config();

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const yaninaNumber = process.env.YANINA_NUMBER;

// Conexión a MySQL
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'bot_yanina'
});

db.connect((err) => {
  if (err) {
    console.error('❌ Error al conectar con MySQL:', err);
  } else {
    console.log('✅ Conectado a MySQL');
  }
});

// Diccionario temporal para guardar el estado del usuario
const estadoUsuarios = {};

app.post('/webhook', (req, res) => {
  const numero = req.body.From;
  const mensaje = req.body.Body.trim();
  const incomingMsg = mensaje.toLowerCase();

  let esPrimerMensaje = false;

  db.query(
    'SELECT fecha FROM mensajes WHERE numero = ? ORDER BY fecha DESC LIMIT 1',
    [numero],
    (err, results) => {
      if (err) {
        console.error('❌ Error al verificar último mensaje:', err);
        res.sendStatus(500);
      } else {
        const ahora = new Date();
        if (
          results.length === 0 ||
          (ahora - new Date(results[0].fecha)) / (1000 * 60) > 10
        ) {
          esPrimerMensaje = true;
        }
        procesarMensaje();
      }
    }
  );

  function procesarMensaje() {
    db.query(
      'INSERT INTO mensajes (numero, mensaje) VALUES (?, ?)',
      [numero, mensaje],
      (err) => {
        if (err) console.error('❌ Error al guardar en MySQL:', err);
        else console.log('💾 Mensaje guardado:', mensaje);
      }
    );

    if (estadoUsuarios[numero]?.esperandoNombre) {
      estadoUsuarios[numero] = { esperandoMensaje: true, nombre: mensaje };
      return responder(`Gracias ${mensaje}. Ahora escribí brevemente tu consulta para que Yanina la vea.`);
    }

    if (estadoUsuarios[numero]?.esperandoMensaje) {
      const nombre = estadoUsuarios[numero].nombre;
      delete estadoUsuarios[numero];
      enviarNotificacion(nombre, numero, mensaje);
      return responder('¡Gracias! Tu mensaje fue enviado a Yanina. Ella te responderá pronto 🧠');
    }

    if (esPrimerMensaje || incomingMsg.includes('menu') || incomingMsg.includes('menú')) {
      return responder(
        `👋 ¡Hola! ¿En qué puedo ayudarte?\n\n1️⃣ Saber el precio de las clases\n2️⃣ Ver modalidades (online/presencial)\n3️⃣ Consultar horarios disponibles\n4️⃣ Hablar con Yanina`
      );
    }

    switch (incomingMsg) {
      case '1':
        return responder('Las clases cuestan $18000 por hora.');
      case '2':
        return responder('Doy clases online por Zoom y presenciales en Zona Norte.');
      case '3':
        return responder('Enseguida te contacto para coordinar un horario 😊');
      case '4':
        estadoUsuarios[numero] = { esperandoNombre: true };
        return responder('Para contactar a Yanina, primero decime tu nombre.');
      default:
        return responder('Perdón, no entendí tu mensaje. Escribí *menú* para ver las opciones disponibles.');
    }
  }

  function responder(texto) {
    const twiml = `<Response><Message>${texto}</Message></Response>`;
    res.type('text/xml').send(twiml);
  }

  function enviarNotificacion(nombre, numero, mensaje) {
    const cuerpo = `📢 NUEVA CONSULTA PARA RESPONDER \nDE: ${nombre} → ${numero}\nMensaje: ${mensaje}`;
    client.messages
      .create({
        from: 'whatsapp:+14155238886',
        to: yaninaNumber,
        body: cuerpo
      })
      .then(() => console.log('✅ Notificación enviada a Yanina'))
      .catch((err) => console.error('❌ Error al notificar a Yanina:', err));
  }
});

app.listen(3000, () => {
  console.log('🚀 Bot activo en http://localhost:3000');
});
