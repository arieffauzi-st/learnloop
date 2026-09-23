/** Room messages. Living soldier positions never leave the owning PC. */

export type NetMsg =
  | { type: "ready-ping"; role: "host" | "guest" }
  | { type: "deploy-done" }
  | { type: "both-deployed" }
  | {
      type: "dot";
      /** Normalized blot on shooter's half (0..1 of full paper). */
      nx: number;
      ny: number;
    }
  | {
      type: "fold-result";
      hit: boolean;
      /** Defender soldiers still alive (count only). */
      defenderRemaining: number;
      /** Only the fallen unit position — never the living army. */
      dead?: { nx: number; ny: number };
    }
  | { type: "game-over"; winner: "host" | "guest" | "draw" }
  | { type: "play-again" };

export function randomRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 5; i++) {
    out += chars[Math.floor(Math.random() * chars.length)]!;
  }
  return out;
}

export function roomTopic(code: string): string {
  return `forfun/perang-kertas/${code.trim().toUpperCase()}`;
}
