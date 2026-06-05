import express from 'express';
import next from 'next';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';

const dev = process.env.NODE_ENV !== 'production';
// Set directory to root of backend folder so Next.js loads correctly
const app = next({ dev, dir: '.' });
const handle = app.getRequestHandler();
const port = parseInt(process.env.PORT || '3000', 10);

app.prepare().then(() => {
  const server = express();
  const httpServer = http.createServer(server);
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    },
  });

  server.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  server.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));

  // Socket.IO event registrations
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    socket.on('join_user', (userId: string) => {
      socket.join(`user:${userId}`);
      console.log(`User socket ${socket.id} joined room: user:${userId}`);
    });

    socket.on('join_salon', (salonId: string) => {
      socket.join(`salon:${salonId}`);
      console.log(`Salon socket ${socket.id} joined room: salon:${salonId}`);
    });

    socket.on('send_chat', (data: { senderId: string; receiverId: string; message: string }) => {
      io.to(`user:${data.receiverId}`).emit('new_chat', data);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  // Attach socket server globally for Next.js route handlers
  (global as any).io = io;

  // Let Next.js handle all requests (both app/pages and route API handlers)
  server.all('*', (req, res) => {
    return handle(req, res);
  });

  httpServer.listen(port, () => {
    console.log(`> GlowBook Server ready on http://localhost:${port}`);
  });
}).catch((err) => {
  console.error('Error starting custom server:', err);
});
