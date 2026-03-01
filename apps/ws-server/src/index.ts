import { WebSocketServer, WebSocket } from "ws";
import { Kafka, Consumer } from "kafkajs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import http from "http";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const PORT = parseInt(process.env.WS_PORT || "8081", 10);
const KAFKA_BROKER = process.env.KAFKA_BROKER!;
const JWT_SECRET = process.env.JWT_SECRET!;
const KAFKA_TOPIC = "job-progress";
const GROUP_ID = `ws-server-${process.env.POD_ID || "1"}`;

interface ProgressMessage {
  jobId: string;
  userId: string;
  stage: "download" | "transcode";
  progress: number;
  status: string;
  ts: string;
}

// Map userId -> set of connected WebSocket clients
const clients = new Map<string, Set<WebSocket>>();

function extractUserId(token: string): string | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    return payload.userId;
  } catch {
    return null;
  }
}

function broadcast(userId: string, msg: ProgressMessage) {
  const sockets = clients.get(userId);
  if (!sockets) return;
  const data = JSON.stringify(msg);
  for (const ws of sockets) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}

async function startKafkaConsumer() {
  const kafka = new Kafka({
    clientId: "ws-server",
    brokers: [KAFKA_BROKER],
    retry: { retries: 10 },
  });

  const consumer: Consumer = kafka.consumer({ groupId: GROUP_ID });
  await consumer.connect();
  await consumer.subscribe({ topic: KAFKA_TOPIC, fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;
      try {
        const msg: ProgressMessage = JSON.parse(message.value.toString());
        broadcast(msg.userId, msg);
      } catch {
        // ignore malformed messages
      }
    },
  });

  return consumer;
}

async function main() {
  const server = http.createServer((_, res) => {
    res.writeHead(200);
    res.end("ws-server running");
  });

  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url ?? "/", `http://localhost`);
    const token = url.searchParams.get("token");

    if (!token) {
      ws.close(4001, "Missing token");
      return;
    }

    const userId = extractUserId(token);
    if (!userId) {
      ws.close(4003, "Invalid token");
      return;
    }

    if (!clients.has(userId)) {
      clients.set(userId, new Set());
    }
    clients.get(userId)!.add(ws);
    console.log(`Client connected: userId=${userId}`);

    ws.on("close", () => {
      clients.get(userId)?.delete(ws);
      if (clients.get(userId)?.size === 0) {
        clients.delete(userId);
      }
      console.log(`Client disconnected: userId=${userId}`);
    });

    ws.on("error", (err) => {
      console.error(`WebSocket error for userId=${userId}:`, err.message);
    });

    ws.send(JSON.stringify({ type: "connected", userId }));
  });

  await startKafkaConsumer();

  server.listen(PORT, () => {
    console.log(`ws-server listening on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error("ws-server fatal error:", err);
  process.exit(1);
});
