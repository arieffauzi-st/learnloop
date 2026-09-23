import mqtt, { type MqttClient } from "mqtt";
import { roomTopic, type NetMsg } from "./protocol";

export type LinkHandlers = {
  /** Broker connected + subscribed (host: room is live). */
  onBrokerReady?: () => void;
  /** Peer hello seen — both sides can start. */
  onOpen: () => void;
  onMsg: (msg: NetMsg) => void;
  onClose: () => void;
  onError: (message: string) => void;
};

export type RoomLink = {
  send: (msg: NetMsg) => void;
  destroy: () => void;
};

type HelloPayload = { type: "hello"; role: "host" | "guest" };

type Envelope = {
  senderId: string;
  role: "host" | "guest";
  payload: NetMsg | HelloPayload;
};

/** Public MQTT over WSS — works across two PCs without WebRTC/NAT. */
const BROKERS = [
  "wss://broker.emqx.io:8084/mqtt",
  "wss://broker.hivemq.com:8884/mqtt",
];

function newSenderId(): string {
  return `pk_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

/**
 * Both host & guest join the same MQTT topic keyed by room code.
 * Small JSON only — no living army coordinates.
 */
export function connectRoom(
  code: string,
  role: "host" | "guest",
  handlers: LinkHandlers,
): RoomLink {
  const topic = roomTopic(code);
  const senderId = newSenderId();
  let client: MqttClient | null = null;
  let paired = false;
  let destroyed = false;
  let brokerIndex = 0;

  const publish = (payload: Envelope["payload"]) => {
    if (!client?.connected) return;
    const env: Envelope = { senderId, role, payload };
    client.publish(topic, JSON.stringify(env), { qos: 0 });
  };

  const tryConnect = () => {
    if (destroyed) return;
    const url = BROKERS[brokerIndex]!;
    client = mqtt.connect(url, {
      clientId: senderId,
      clean: true,
      reconnectPeriod: 0,
      connectTimeout: 12_000,
      protocolVersion: 4,
    });

    client.on("connect", () => {
      client?.subscribe(topic, { qos: 0 }, (err) => {
        if (err) {
          handlers.onError(`Failed to subscribe: ${err.message}`);
          return;
        }
        handlers.onBrokerReady?.();
        // Announce presence so the other side can pair.
        publish({ type: "hello", role });
        // Host may have joined first; guest hello will pair. Also re-hello shortly.
        window.setTimeout(() => {
          if (!destroyed && !paired) publish({ type: "hello", role });
        }, 800);
      });
    });

    client.on("message", (_t, buf) => {
      let env: Envelope;
      try {
        env = JSON.parse(buf.toString()) as Envelope;
      } catch {
        return;
      }
      if (!env || env.senderId === senderId) return;

      if (env.payload?.type === "hello") {
        if (!paired) {
          paired = true;
          // Reply so late joiners also pair.
          publish({ type: "hello", role });
          handlers.onOpen();
        }
        return;
      }

      handlers.onMsg(env.payload as NetMsg);
    });

    client.on("error", (err) => {
      handlers.onError(err.message || String(err));
    });

    client.on("close", () => {
      if (destroyed) return;
      if (!paired && brokerIndex < BROKERS.length - 1) {
        brokerIndex += 1;
        client?.end(true);
        client = null;
        handlers.onError(`Broker unavailable, trying the backup broker…`);
        window.setTimeout(tryConnect, 400);
        return;
      }
      handlers.onClose();
    });
  };

  tryConnect();

  return {
    send: (msg) => publish(msg),
    destroy: () => {
      destroyed = true;
      try {
        client?.end(true);
      } catch {
        /* ignore */
      }
      client = null;
    },
  };
}
