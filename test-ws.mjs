import { WebSocketServer, WebSocket } from 'ws';

const wss = new WebSocketServer({ port: 8080 });
wss.on('connection', (ws) => {
  try {
    ws.close(1006);
  } catch (err) {
    console.error("Caught:", err.message);
  }
});

const client = new WebSocket('ws://localhost:8080');
client.on('error', console.error);
