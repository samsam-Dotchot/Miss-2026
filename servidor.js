const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// Aumentar el límite de tamaño para aceptar imágenes en Base64 desde la PC
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cors());

// CONEXIÓN A MONGODB ATLAS
mongoose.connect('mongodb+srv://leivasamarya_db_user:Trinyzx18@cluster0.mmek2ac.mongodb.net/mi_base_datos?retryWrites=true&w=majority')
  .then(() => console.log('¡Conectado a MongoDB Atlas con éxito!'))
  .catch(err => console.error('Error al conectar:', err));

// 1. ESQUEMA DE CANDIDATAS
const candidataSchema = new mongoose.Schema({
    nombre: String,
    dedicacion: String,
    propuesta: String,
    foto: String,
    instagram: String,
    fecha: { type: Date, default: Date.now }
});
const Candidata = mongoose.model('Candidata', candidataSchema);

// 2. ESQUEMA DE VOTOS (Agregamos unique: true en correo)
const votoSchema = new mongoose.Schema({
    nombre: String,
    correo: { type: String, unique: true, required: true, lowercase: true, trim: true },
    candidata: String,
    fecha: { type: Date, default: Date.now }
});
const Voto = mongoose.model('Voto', votoSchema);

// 3. ESQUEMA DE PERSONAS (También con unique: true para mantener sincronizado el padrón)
const personaSchema = new mongoose.Schema({
    nombre: String,
    correo: { type: String, unique: true, required: true, lowercase: true, trim: true },
    candidata: String,
    fecha: { type: Date, default: Date.now }
});
const Persona = mongoose.model('Persona', personaSchema);

// Ruta absoluta corregida para Railway
app.use(express.static(path.join(__dirname, 'public')));

// --- RUTAS DE CANDIDATAS ---

app.get('/api/candidatas', async (req, res) => {
    try {
        const candidatas = await Candidata.find();
        res.json(candidatas);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener las candidatas' });
    }
});

app.post('/api/candidatas', async (req, res) => {
    try {
        const nuevaCandidata = new Candidata(req.body);
        await nuevaCandidata.save();
        res.status(201).json({ exito: true, mensaje: 'Candidata registrada correctamente' });
    } catch (error) {
        res.status(500).json({ exito: false, error: 'Error al guardar la candidata' });
    }
});


// --- RUTAS DE VOTOS Y PERSONAS ---

app.post('/api/votos', async (req, res) => {
    try {
        const { nombre, correo, candidata } = req.body;

        // 1. Guardar en la colección de votos
        const nuevoVoto = new Voto({ nombre, correo, candidata });
        await nuevoVoto.save();

        // 2. Guardar también en la colección de personas (Padrón de votantes)
        const nuevaPersona = new Persona({ nombre, correo, candidata });
        await nuevaPersona.save();

        res.status(201).json({ exito: true, mensaje: 'Voto y registro guardados correctamente' });
    } catch (error) {
        // Si MongoDB detecta un correo duplicado, arroja el código de error 11000
        if (error.code === 11000) {
            return res.status(400).json({ 
                exito: false, 
                error: 'Este correo ya ha emitido un voto anteriormente.' 
            });
        }
        res.status(500).json({ exito: false, error: 'Error al guardar el voto' });
    }
});

app.get('/api/votos', async (req, res) => {
    try {
        const { nombre } = req.query;
        let filtro = {};
        if (nombre) {
            filtro.nombre = { $regex: nombre, $options: 'i' }; 
        }
        const votos = await Voto.find(filtro);
        res.json(votos);
    } catch (error) {
        res.status(500).json({ error: 'Error al consultar los votos' });
    }
});

app.get('/api/personas', async (req, res) => {
    try {
        const { nombre } = req.query;
        let filtro = {};
        if (nombre) {
            filtro.nombre = { $regex: nombre, $options: 'i' };
        }
        const personas = await Persona.find(filtro);
        res.json(personas);
    } catch (error) {
        res.status(500).json({ error: 'Error al consultar las personas' });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
