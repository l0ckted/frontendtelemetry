import express from 'express';
import axios from 'axios';
import cookieParser from 'cookie-parser';
import session from 'express-session'; // Necesitamos usar express-session para manejar sesiones
import { fileURLToPath } from 'url';
import path from 'path';

const app = express();
app.use(express.json());
app.use(cookieParser());

// Configuración de sesiones para guardar datos entre peticiones
app.use(session({
  secret: 'mi_clave_secreta', // Debe ser algo seguro
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.NODE_ENV === 'production' }, // Se asegura de que las cookies se envíen solo en HTTPS en producción
}));

// Obtén el directorio actual de forma compatible con ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Ruta para hacer solicitudes a /api/usuarios/login del servidor 5000
app.post('/login', async (req, res) => {
  const { email, contrasena } = req.body;

  try {
    // Realiza la solicitud POST al servidor 3000
    const response = await axios.post('https://api.desert-iot.cl/api/usuarios/login', {
      email,
      contrasena
    });

    // Si la respuesta tiene un token, lo guardamos en una cookie
    if (response.data.token) {
      // Guardar el tipo de sensor en la sesión (para futuras solicitudes)
      req.session.sessionData = {
        token: response.data.token,
        tiposSensor: response.data.tiposSensor, // Guardamos los tipos de sensor en la sesión
      };

      res.cookie('auth_token', response.data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 3600000, // 1 hora
        sameSite: 'Strict',
      });

      // Mandamos los datos completos, incluidos areas, tiposSensor, etc.
      res.json({
        message: 'Inicio de sesión exitoso',
        token: response.data.token,
        sessionData: response.data, // Enviar toda la data al cliente (incluyendo areas, tiposSensor, etc.)
      });
    } else {
      res.status(400).json({ message: 'No se generó un token en la respuesta' });
    }
  } catch (error) {
    console.error('Error al hacer la solicitud:', error);
    res.status(500).json({ message: 'Error al hacer la solicitud ' });
  }
});

const Router = express.Router();
// Ruta para obtener datos de humedad de suelo desde el servidor 3000
Router.get('/npk_sensor/:fechaInicio/:fechaFin/:sensor_id/:area_id/:cliente_id', async (req, res) => {
  const { fechaInicio, fechaFin, sensor_id, area_id, cliente_id } = req.params;

  try {
    // Hacer la solicitud GET al servidor externo en localhost:3000
    const apiUrl = `http://localhost:3000/api/npk-sensor/${fechaInicio}/${fechaFin}/${sensor_id}/${area_id}/${cliente_id}`;
    const response = await axios.get(apiUrl);

    // Devolver la respuesta directamente al cliente
    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error al obtener datos del sensor:', error);
    res.status(500).json({ message: 'Error al obtener los datos del sensor.' });
  }
});

Router.get('/humedad-suelo/:fechaInicio/:fechaFin/:sensor_id/:area_id/:cliente_id', async (req, res) => {
  const { fechaInicio, fechaFin, sensor_id, area_id, cliente_id } = req.params;

  try {
    // Hacer la solicitud GET al servidor externo en localhost:3000
    const apiUrl = `https://api.desert-iot.cl/api/humedad-suelo/${fechaInicio}/${fechaFin}/${sensor_id}/${area_id}/${cliente_id}`;
    const response = await axios.get(apiUrl);

    // Devolver la respuesta directamente al cliente
    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error al obtener datos del sensor:', error);
    res.status(500).json({ message: 'Error al obtener los datos del sensor.' });
  }
});

Router.get('/humedad-hoja/:fechaInicio/:fechaFin/:sensor_id/:area_id/:cliente_id', async (req, res) => {
  const { fechaInicio, fechaFin, sensor_id, area_id, cliente_id } = req.params;

  try {
    // Hacer la solicitud GET al servidor externo en localhost:3000
    const apiUrl = `http://localhost:3000/api/humedad-hoja/${fechaInicio}/${fechaFin}/${sensor_id}/${area_id}/${cliente_id}`;
    const response = await axios.get(apiUrl);

    // Devolver la respuesta directamente al cliente
    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error al obtener datos del sensor:', error);
    res.status(500).json({ message: 'Error al obtener los datos del sensor.' });
  }
});

Router.get('/ph-sensor/:fechaInicio/:fechaFin/:sensor_id/:area_id/:cliente_id', async (req, res) => {
  const { fechaInicio, fechaFin, sensor_id, area_id, cliente_id } = req.params;

  try {
    // Hacer la solicitud GET al servidor externo en localhost:3000
    const apiUrl = `http://localhost:3000/api/ph-sensor/${fechaInicio}/${fechaFin}/${sensor_id}/${area_id}/${cliente_id}`;
    const response = await axios.get(apiUrl);

    // Devolver la respuesta directamente al cliente
    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error al obtener datos del sensor:', error);
    res.status(500).json({ message: 'Error al obtener los datos del sensor.' });
  }
});



app.use('/api', Router); // Agregar el router a la aplicación
export default Router;

// Configura el puerto del servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});

