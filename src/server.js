import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import http from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import authRoutes from './routes/authRoutes.js';
import scheduleRoutes from './routes/scheduleRoutes.js';
import userRoutes from './routes/userRoutes.js';
import groupRoutes from './routes/groupRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import friendRequestRoutes from './routes/friendRequestRoutes.js';



dotenv.config();

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  'https://classmate-sync.maruqes.com',
  'https://classmate-sync-api.maruqes.com',
  'http://localhost:5173',
  'http://localhost:3000',
];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  },
});

// Presença online (em memória)
// key: userId (string)
// value: { sockets: Set<string>, lastSeen: Date }
const onlineUsers = new Map();

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());



app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRoutes);
app.use('/schedules', scheduleRoutes);
app.use('/users', userRoutes);
app.use('/groups', groupRoutes);
app.use('/events', eventRoutes);
app.use('/friend-requests', friendRequestRoutes);


const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/classmate_sync';

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB ligado');
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`API a correr em http://0.0.0.0:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Erro a ligar ao MongoDB:', err);
  });

io.on('connection', (socket) => {
  console.log('Novo cliente WebSocket ligado:', socket.id);

  socket.on('auth', (token) => {
    try {
      if (!token || typeof token !== 'string') {
        socket.emit('presence:error', { message: 'Token não fornecido.' });
        return;
      }

      // aceita "Bearer <token>" ou token direto
      const rawToken = token.startsWith('Bearer ') ? token.slice('Bearer '.length) : token;

      const decoded = jwt.verify(rawToken, process.env.JWT_SECRET || 'dev-secret');
      const userId = decoded?.userId?.toString?.();

      if (!userId) {
        socket.emit('presence:error', { message: 'Token inválido.' });
        return;
      }

      // se este socket já tinha outro user associado, remover dessa entrada
      if (socket.data.userId && socket.data.userId !== userId) {
        const prev = onlineUsers.get(socket.data.userId);
        if (prev) {
          prev.sockets.delete(socket.id);
          if (prev.sockets.size === 0) {
            prev.lastSeen = new Date();
            onlineUsers.set(socket.data.userId, prev);
          }
        }
      }

      socket.data.userId = userId;

      const entry = onlineUsers.get(userId) || { sockets: new Set(), lastSeen: new Date() };
      entry.sockets.add(socket.id);
      onlineUsers.set(userId, entry);

      socket.emit('presence:me', { userId, online: true });
      io.emit('presence:update', { userId, online: true });
    } catch (err) {
      console.error('Erro no socket auth:', err);
      socket.emit('presence:error', { message: 'Token inválido ou expirado.' });
    }
  });

  socket.on('disconnect', () => {
    console.log('Cliente desligado:', socket.id);

    const userId = socket.data.userId;
    if (!userId) return;

    const entry = onlineUsers.get(userId);
    if (!entry) return;

    entry.sockets.delete(socket.id);

    if (entry.sockets.size === 0) {
      entry.lastSeen = new Date();
      onlineUsers.set(userId, entry);
      io.emit('presence:update', { userId, online: false, lastSeen: entry.lastSeen });
    } else {
      onlineUsers.set(userId, entry);
    }
  });
});
