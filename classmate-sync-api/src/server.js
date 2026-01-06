import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import http from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/authRoutes.js';
import scheduleRoutes from './routes/scheduleRoutes.js';
import userRoutes from './routes/userRoutes.js';



dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*' },
});

app.use(cors());
app.use(express.json());



app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRoutes);
app.use('/schedules', scheduleRoutes);
app.use('/users', userRoutes);


const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/classmate_sync';

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB ligado');
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`API a correr em http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Erro a ligar ao MongoDB:', err);
  });

io.on('connection', (socket) => {
  console.log('Novo cliente WebSocket ligado:', socket.id);

  socket.on('disconnect', () => {
    console.log('Cliente desligado:', socket.id);
  });
});
