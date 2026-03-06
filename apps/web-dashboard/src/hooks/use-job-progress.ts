"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { ProgressMessage } from "@/lib/types";

interface JobProgress {
  [jobId: string]: ProgressMessage;
}

export function useJobProgress(): JobProgress {
  const [progress, setProgress] = useState<JobProgress>({});
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) return;

    const wsBase = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8081";
    const ws = new WebSocket(`${wsBase}/progress?token=${token}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg: ProgressMessage = JSON.parse(event.data);
        if (msg.jobId) {
          setProgress((prev) => ({ ...prev, [msg.jobId]: msg }));
        }
      } catch {
        // ignore
      }
    };

    ws.onclose = () => {
      setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  return progress;
}
