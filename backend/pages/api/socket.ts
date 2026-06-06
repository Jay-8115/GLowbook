import { NextApiRequest } from 'next';
import { Server as NetServer } from 'http';
import { Server as ServerIO } from 'socket.io';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function socketHandler(req: NextApiRequest, res: any) {
  if (!res.socket.server.io) {
    console.log('Initializing Socket.io server...');
    const httpServer: NetServer = res.socket.server as any;
    const io = new ServerIO(httpServer, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: '*',
      },
    });

    io.on('connection', (socket) => {
      console.log('Socket client connected:', socket.id);

      socket.on('join_room', (room) => {
        socket.join(room);
        console.log(`Socket ${socket.id} joined room ${room}`);
      });

      socket.on('disconnect', () => {
        console.log('Socket client disconnected:', socket.id);
      });
    });

    res.socket.server.io = io;
    (global as any).io = io;
  }
  res.end();
}
