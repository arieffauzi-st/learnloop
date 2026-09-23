import "./style.css";
/**
 * LearnLoop port of ForFun `perang-kertas` — hotseat + online (2 PC) modes.
 * Online sync follows the reference protocol: hit checks run on the defender's
 * PC and living soldier positions never leave the owning machine.
 */
import { connectRoom, type RoomLink } from "./net/roomLink";
import { randomRoomCode, type NetMsg } from "./net/protocol";

export type PerangKertasOptions = {
  embedded?: boolean;
  onHome?: () => void;
};

type Side = "left" | "right";
type Mode = "hotseat" | "online";
type Phase =
  | "menu"
  | "lobby"
  | "deploy"
  | "ink"
  | "folding"
  | "reveal"
  | "over";

type Soldier = {
  id: number;
  side: Side;
  nx: number;
  ny: number;
  alive: boolean;
  /** Revealed fallen enemy (online) — living enemies never come from the peer. */
  foreign?: boolean;
};

type Blot = {
  nx: number;
  ny: number;
  r: number;
  from: Side;
  mx: number;
  my: number;
  hit: boolean;
};

const SOLDIERS_PER_SIDE = 10;
const HIT_R = 18;
const BLOT_R = 13;
const MARGIN_N = 0.045;

export function createPerangKertas(
  root: HTMLElement,
  options: PerangKertasOptions = {},
): () => void {
  let mode: Mode = "hotseat";
  let phase: Phase = "menu";
  let mySide: Side = "left";
  let deploySide: Side = "left";
  let turn: Side = "left";
  let soldiers: Soldier[] = [];
  let blots: Blot[] = [];
  let nextId = 1;
  let foldT = 0;
  let pendingDot: { nx: number; ny: number; side: Side } | null = null;
  let lastResult: "kena" | "miss" | null = null;
  let winner: Side | "draw" | null = null;
  let revealSide: Side | null = null;
  let revealTimer: number | null = null;
  let raf = 0;
  let foldRaf = 0;

  // Online
  let link: RoomLink | null = null;
  let roomCode = "";
  let onlineRole: "host" | "guest" | null = null;
  let iDeployed = false;
  let theyDeployed = false;
  let myRemaining = SOLDIERS_PER_SIDE;
  let theirRemaining = SOLDIERS_PER_SIDE;
  let netStatus = "";

  const shell = () => {
    root.innerHTML = `
    <div class="perang-kertas">
      <header class="topbar">
        <div class="brand">
          <div class="brand-kicker">LearnLoop · Paper War</div>
          <h1>Paper War</h1>
          <p class="pk-sub">(Perang Kertas)</p>
          <p>Fold the paper, hide your army, and outguess your opponent — on one screen or across two computers.</p>
        </div>
        ${
          options.embedded
            ? `<button type="button" class="btn ghost" id="homeBtn">← Games hub</button>`
            : ""
        }
      </header>
      <div id="view"></div>
    </div>
  `;
    root.querySelector("#homeBtn")?.addEventListener("click", () => {
      options.onHome?.();
    });
  };

  shell();
  const view = () => root.querySelector<HTMLElement>("#view")!;

  function destroyLink(): void {
    link?.destroy();
    link = null;
  }

  function goMenu(): void {
    destroyLink();
    phase = "menu";
    renderMenu();
  }

  function renderMenu(): void {
    view().innerHTML = `
      <div class="pk-menu">
        <div class="card pk-menu-card">
          <h2>Choose how to play</h2>
          <p class="explain"><strong>Hotseat (one device)</strong> — two players share one screen; the opponent's side stays hidden so positions remain secret.</p>
          <p class="explain">For <strong>Online (2 devices)</strong>: one player creates a room → gets a <strong>code</strong> → shares it with the opponent (chat/whatever you like). The other player types that same code and joins. Nobody without the code can enter your game.</p>
          <div class="btn-row" style="margin-top:1rem">
            <button type="button" class="btn" id="hotseat">Hotseat (one device)</button>
            <button type="button" class="btn warm" id="host">Online (2 devices) — create a room</button>
          </div>
          <p class="explain" style="margin-top:1rem;margin-bottom:0.35rem">Got a code from your opponent?</p>
          <div class="pk-join">
            <input id="joinCode" maxlength="5" placeholder="Type the code here" autocomplete="off" />
            <button type="button" class="btn" id="join">Join</button>
          </div>
          <p class="pk-note" id="menuErr"></p>
        </div>
      </div>
    `;
    view().querySelector("#hotseat")!.addEventListener("click", () => {
      mode = "hotseat";
      startHotseat();
    });
    view().querySelector("#host")!.addEventListener("click", () => {
      mode = "online";
      onlineRole = "host";
      mySide = "left";
      roomCode = randomRoomCode();
      startLobbyHost();
    });
    view().querySelector("#join")!.addEventListener("click", () => {
      const code = (
        view().querySelector<HTMLInputElement>("#joinCode")?.value || ""
      )
        .trim()
        .toUpperCase();
      const err = view().querySelector("#menuErr")!;
      if (code.length < 4) {
        err.textContent =
          "Enter the room code you got from the player who created the room.";
        return;
      }
      mode = "online";
      onlineRole = "guest";
      mySide = "right";
      roomCode = code;
      startLobbyGuest();
    });
  }

  function friendlyNetError(message: string): string {
    return `Connection problem: ${message}. Please check your internet and try again.`;
  }

  function startLobbyHost(): void {
    phase = "lobby";
    netStatus = "Preparing your room…";
    renderLobby();
    let started = false;
    const startOnce = () => {
      if (started) return;
      started = true;
      netStatus = "Opponent connected!";
      link?.send({ type: "ready-ping", role: "host" });
      renderLobby();
      window.setTimeout(() => beginOnlineDeploy(), 400);
    };
    link = connectRoom(roomCode, "host", {
      onBrokerReady: () => {
        netStatus = "Room is live — waiting for your opponent to type the code…";
        renderLobby();
      },
      onOpen: startOnce,
      onMsg: onNetMsg,
      onClose: () => {
        netStatus = "Connection lost.";
        renderLobby();
      },
      onError: (m) => {
        netStatus = friendlyNetError(m);
        renderLobby();
      },
    });
  }

  function startLobbyGuest(): void {
    phase = "lobby";
    netStatus = "Connecting to the room…";
    renderLobby();
    let started = false;
    const startOnce = () => {
      if (started) return;
      started = true;
      netStatus = "Connected to the host!";
      link?.send({ type: "ready-ping", role: "guest" });
      renderLobby();
      window.setTimeout(() => beginOnlineDeploy(), 400);
    };
    link = connectRoom(roomCode, "guest", {
      onBrokerReady: () => {
        netStatus = "Joining the broker… looking for the host with this code…";
        renderLobby();
      },
      onOpen: startOnce,
      onMsg: onNetMsg,
      onClose: () => {
        netStatus = "Connection lost.";
        renderLobby();
      },
      onError: (m) => {
        netStatus = friendlyNetError(m);
        renderLobby();
      },
    });
  }

  function renderLobby(): void {
    const isHost = onlineRole === "host";
    view().innerHTML = `
      <div class="pk-menu">
        <div class="card pk-menu-card">
          <h2>${isHost ? "You are the host" : "Joining…"}</h2>
          ${
            isHost
              ? `<p class="explain">Share this code with your opponent (only 1 person):</p>
                 <p class="explain">Code: <strong class="pk-code">${roomCode}</strong></p>
                 <p class="explain">Your opponent opens this page → Paper War → types the code → <strong>Join</strong>. Anyone without the code cannot enter your game.</p>`
              : `<p class="explain">Code: <strong class="pk-code">${roomCode}</strong></p>
                 <p class="explain">Connecting to the host…</p>`
          }
          <p class="explain">You play on the <strong>${mySide === "left" ? "LEFT" : "RIGHT"}</strong> field</p>
          <p class="explain" id="lobbyStatus">${netStatus}</p>
          <div class="btn-row">
            <button type="button" class="btn ghost" id="backMenu">← Cancel</button>
          </div>
        </div>
      </div>
    `;
    view().querySelector("#backMenu")!.addEventListener("click", goMenu);
  }

  function beginOnlineDeploy(): void {
    resetMatchState();
    phase = "deploy";
    deploySide = mySide;
    iDeployed = false;
    theyDeployed = false;
    renderGameShell();
    updateHud();
    resize();
  }

  function startHotseat(): void {
    resetMatchState();
    mode = "hotseat";
    phase = "deploy";
    deploySide = "left";
    mySide = "left";
    turn = "left";
    renderGameShell();
    updateHud();
    resize();
  }

  function resetMatchState(): void {
    soldiers = [];
    blots = [];
    nextId = 1;
    foldT = 0;
    pendingDot = null;
    lastResult = null;
    winner = null;
    revealSide = null;
    myRemaining = SOLDIERS_PER_SIDE;
    theirRemaining = SOLDIERS_PER_SIDE;
    if (revealTimer !== null) {
      window.clearTimeout(revealTimer);
      revealTimer = null;
    }
  }

  function renderGameShell(): void {
    view().innerHTML = `
      <div class="layout">
        <section class="stage">
          <canvas id="c"></canvas>
          <div class="stage-hint" id="hint"></div>
        </section>
        <aside class="side">
          <div class="card">
            <h2>How to play</h2>
            <ol class="steps">
              <li>Place <strong>${SOLDIERS_PER_SIDE} stickmen</strong> on your field. The opponent's side stays hidden.</li>
              <li>Drop an <strong>ink dot</strong> on your paper — it folds over to the opponent.</li>
              <li>Repeat until <strong>all</strong> of the opponent's soldiers are hit.</li>
              ${
                mode === "online"
                  ? `<li>2-PC mode · code <strong>${roomCode}</strong> · living armies are never sent over the network.</li>`
                  : `<li>One-screen mode · take turns, sides stay hidden.</li>`
              }
            </ol>
            <div class="btn-row">
              <button type="button" class="btn warm" id="reset">Play again</button>
              <button type="button" class="btn ghost" id="toMenu">Change mode</button>
            </div>
          </div>
          <div class="card">
            <h2>Status</h2>
            <p class="explain" id="explain"></p>
            <div id="stats" style="margin-top:0.75rem"></div>
          </div>
        </aside>
      </div>
    `;
    bindGameDom();
  }

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let hintEl: HTMLElement;
  let explainEl: HTMLElement;
  let statsEl: HTMLElement;

  function bindGameDom(): void {
    canvas = view().querySelector("#c")!;
    ctx = canvas.getContext("2d")!;
    hintEl = view().querySelector("#hint")!;
    explainEl = view().querySelector("#explain")!;
    statsEl = view().querySelector("#stats")!;
    canvas.addEventListener("pointerdown", onPointerDown);
    view().querySelector("#reset")!.addEventListener("click", onResetClick);
    view().querySelector("#toMenu")!.addEventListener("click", goMenu);
  }

  function onResetClick(): void {
    if (mode === "online") {
      link?.send({ type: "play-again" });
      beginOnlineDeploy();
      return;
    }
    startHotseat();
  }

  function w(): number {
    return canvas.width;
  }
  function h(): number {
    return canvas.height;
  }
  function foldX(): number {
    return w() / 2;
  }
  function px(nx: number, ny: number): { x: number; y: number } {
    return { x: nx * w(), y: ny * h() };
  }
  function toN(x: number, y: number): { nx: number; ny: number } {
    return { nx: x / w(), ny: y / h() };
  }

  function countAlive(side: Side): number {
    return soldiers.filter((s) => s.side === side && s.alive && !s.foreign)
      .length;
  }

  function deployedMine(): number {
    if (mode === "online") {
      return soldiers.filter((s) => s.side === mySide && !s.foreign).length;
    }
    return soldiers.filter((s) => s.side === deploySide).length;
  }

  function visibleSide(): Side {
    if (mode === "online") {
      if (phase === "reveal" && revealSide) return revealSide;
      return mySide;
    }
    if (phase === "deploy") return deploySide;
    if (phase === "folding" && pendingDot) return pendingDot.side;
    if (phase === "reveal" && revealSide) return revealSide;
    if (phase === "over") return "left";
    return turn;
  }

  function bothSidesOpen(): boolean {
    return mode === "hotseat" && phase === "over";
  }

  function updateHud(): void {
    if (phase === "menu" || phase === "lobby") return;

    if (mode === "online") {
      updateHudOnline();
      return;
    }

    const leftN = countAlive("left");
    const rightN = countAlive("right");

    if (phase === "deploy") {
      const need = SOLDIERS_PER_SIDE - deployedMine();
      explainEl.textContent =
        deploySide === "left"
          ? `LEFT player, place ${need} more stickman${need === 1 ? "" : "s"}. Right side is hidden.`
          : `RIGHT player, place ${need} more stickman${need === 1 ? "" : "s"}. Left side is hidden.`;
      hintEl.textContent = `Place · click the ${deploySide === "left" ? "LEFT" : "RIGHT"} side`;
    } else if (phase === "ink") {
      const bit =
        lastResult === "kena"
          ? " That dot was a HIT! "
          : lastResult === "miss"
            ? " That dot missed. "
            : " ";
      explainEl.textContent =
        turn === "left"
          ? `It's LEFT's turn to drop ink.${bit}Opponent has ${rightN} left.`
          : `It's RIGHT's turn to drop ink.${bit}Opponent has ${leftN} left.`;
      hintEl.textContent = `Drop dot · ${turn === "left" ? "LEFT" : "RIGHT"} side`;
    } else if (phase === "folding") {
      explainEl.textContent = "Folding the paper…";
      hintEl.textContent = "Fold";
    } else if (phase === "reveal") {
      explainEl.textContent =
        lastResult === "kena" ? "HIT! Stickman down." : "Missed.";
      hintEl.textContent = "Fold result";
    } else if (winner === "draw") {
      explainEl.textContent = "It's a draw.";
      hintEl.textContent = "Game over";
    } else {
      explainEl.textContent =
        winner === "left" ? "LEFT wins!" : "RIGHT wins!";
      hintEl.textContent = "Game over";
    }

    statsEl.innerHTML = `
      <div class="stat"><span>Left remaining</span><strong>${leftN}/${SOLDIERS_PER_SIDE}</strong></div>
      <div class="stat"><span>Right remaining</span><strong>${rightN}/${SOLDIERS_PER_SIDE}</strong></div>
      <div class="stat"><span>Dots</span><strong>${blots.length}</strong></div>
    `;
  }

  function updateHudOnline(): void {
    if (phase === "deploy") {
      const need = SOLDIERS_PER_SIDE - deployedMine();
      explainEl.textContent = iDeployed
        ? theyDeployed
          ? "Both players are ready…"
          : "You are ready. Waiting for the opponent to finish placing…"
        : `Place stickmen on your ${mySide === "left" ? "LEFT" : "RIGHT"} field — ${need} more. The opponent never sees these positions.`;
      hintEl.textContent = iDeployed
        ? "Waiting for opponent"
        : `Place on the ${mySide === "left" ? "LEFT" : "RIGHT"} side`;
    } else if (phase === "ink") {
      const mine = turn === mySide;
      const bit =
        lastResult === "kena"
          ? " That dot was a HIT! "
          : lastResult === "miss"
            ? " That dot missed. "
            : " ";
      explainEl.textContent = mine
        ? `Your turn to drop ink.${bit}Opponent has ${theirRemaining} left (positions secret).`
        : `Opponent's turn.${bit}Your army has ${myRemaining} left.`;
      hintEl.textContent = mine
        ? "Drop a dot on your field"
        : "Waiting for the opponent to drop ink…";
    } else if (phase === "folding") {
      explainEl.textContent =
        "Folding… the ink is sent to the opponent's PC for the hit check.";
      hintEl.textContent = "Fold + check on opponent's PC";
    } else if (phase === "reveal") {
      explainEl.textContent =
        lastResult === "kena"
          ? "HIT! (only the fallen stickman is shown)"
          : "Missed — the opponent's living army stays hidden.";
      hintEl.textContent = "Result";
    } else if (phase === "over") {
      explainEl.textContent =
        winner === "draw"
          ? "It's a draw."
          : winner === mySide
            ? "You win — the whole opponent army is down!"
            : "You lose — your whole army is down.";
      hintEl.textContent = "Game over";
    }

    statsEl.innerHTML = `
      <div class="stat"><span>Your army</span><strong>${myRemaining}/${SOLDIERS_PER_SIDE}</strong></div>
      <div class="stat"><span>Opponent (count only)</span><strong>${theirRemaining}/${SOLDIERS_PER_SIDE}</strong></div>
      <div class="stat"><span>Dots</span><strong>${blots.length}</strong></div>
      <div class="stat"><span>Guardrail</span><strong>living positions stay local</strong></div>
    `;
  }

  function inOwnFieldN(nx: number, side: Side): boolean {
    if (side === "left") return nx >= MARGIN_N && nx < 0.5 - 0.012;
    return nx > 0.5 + 0.012 && nx <= 1 - MARGIN_N;
  }

  function placeSoldierN(nx: number, ny: number, side: Side): void {
    if (!inOwnFieldN(nx, side)) return;
    if (ny < MARGIN_N || ny > 1 - MARGIN_N) return;
    const mine = soldiers.filter((s) => s.side === side && !s.foreign);
    if (mine.length >= SOLDIERS_PER_SIDE) return;
    for (const s of mine) {
      const a = px(s.nx, s.ny);
      const b = px(nx, ny);
      if (Math.hypot(a.x - b.x, a.y - b.y) < 28) return;
    }
    soldiers.push({ id: nextId++, side, nx, ny, alive: true });

    if (mode === "online") {
      if (deployedMine() >= SOLDIERS_PER_SIDE && !iDeployed) {
        iDeployed = true;
        myRemaining = SOLDIERS_PER_SIDE;
        link?.send({ type: "deploy-done" });
        maybeStartOnlineInk();
      }
    } else if (mine.length + 1 >= SOLDIERS_PER_SIDE) {
      if (side === "left") deploySide = "right";
      else {
        phase = "ink";
        turn = "left";
        lastResult = null;
      }
    }
    updateHud();
    scheduleDraw();
  }

  function maybeStartOnlineInk(): void {
    if (iDeployed && theyDeployed) {
      phase = "ink";
      turn = "left"; // host always starts
      lastResult = null;
      updateHud();
      scheduleDraw();
    } else {
      updateHud();
    }
  }

  function tryPlaceDotN(nx: number, ny: number): void {
    if (!inOwnFieldN(nx, turn)) return;
    if (ny < MARGIN_N || ny > 1 - MARGIN_N) return;
    if (mode === "online" && turn !== mySide) return;

    pendingDot = { nx, ny, side: turn };
    phase = "folding";
    foldT = 0;
    lastResult = null;
    updateHud();
    animateFold();
  }

  function animateFold(): void {
    cancelAnimationFrame(foldRaf);
    const start = performance.now();
    const tick = (now: number) => {
      foldT = Math.min(1, (now - start) / 700);
      scheduleDraw();
      if (foldT < 1) foldRaf = requestAnimationFrame(tick);
      else onFoldDone();
    };
    foldRaf = requestAnimationFrame(tick);
  }

  function onFoldDone(): void {
    if (!pendingDot) return;

    if (mode === "online") {
      // Send blot to defender PC — they check hits locally.
      const shot = pendingDot;
      link?.send({ type: "dot", nx: shot.nx, ny: shot.ny });
      // Wait for fold-result; keep folding state until reply
      return;
    }

    resolveHotseatDot();
  }

  function resolveHotseatDot(): void {
    if (!pendingDot) return;
    const { nx, ny, side } = pendingDot;
    const mx = 1 - nx;
    const my = ny;
    const enemy: Side = side === "left" ? "right" : "left";
    let hit = false;
    let deadPos: { nx: number; ny: number } | null = null;

    for (const s of soldiers) {
      if (!s.alive || s.side !== enemy || s.foreign) continue;
      const a = px(s.nx, s.ny);
      const b = px(mx, my);
      if (Math.hypot(a.x - b.x, a.y - b.y) <= HIT_R + BLOT_R * 0.4) {
        s.alive = false;
        hit = true;
        deadPos = { nx: s.nx, ny: s.ny };
        break;
      }
    }

    finishDotLocal({ nx, ny, side, mx, my, hit, deadPos });
  }

  function finishDotLocal(args: {
    nx: number;
    ny: number;
    side: Side;
    mx: number;
    my: number;
    hit: boolean;
    deadPos: { nx: number; ny: number } | null;
  }): void {
    const { nx, ny, side, mx, my, hit } = args;
    blots.push({ nx, ny, r: BLOT_R, from: side, mx, my, hit });
    lastResult = hit ? "kena" : "miss";
    pendingDot = null;
    foldT = 0;

    const enemy: Side = side === "left" ? "right" : "left";
    phase = "reveal";
    revealSide = enemy;
    updateHud();
    scheduleDraw();

    if (revealTimer !== null) window.clearTimeout(revealTimer);
    revealTimer = window.setTimeout(() => {
      revealTimer = null;
      revealSide = null;

      if (mode === "online") {
        if (theirRemaining <= 0 && myRemaining <= 0) {
          phase = "over";
          winner = "draw";
        } else if (theirRemaining <= 0) {
          phase = "over";
          winner = mySide;
        } else if (myRemaining <= 0) {
          phase = "over";
          winner = mySide === "left" ? "right" : "left";
        } else {
          phase = "ink";
          turn = enemy;
        }
      } else {
        const leftN = countAlive("left");
        const rightN = countAlive("right");
        if (leftN === 0 && rightN === 0) {
          phase = "over";
          winner = "draw";
        } else if (rightN === 0) {
          phase = "over";
          winner = "left";
        } else if (leftN === 0) {
          phase = "over";
          winner = "right";
        } else {
          phase = "ink";
          turn = enemy;
        }
      }
      updateHud();
      scheduleDraw();
    }, 1600);
  }

  /** Defender PC: check incoming mirrored blot against local army only. */
  function handleIncomingDot(nx: number, ny: number): void {
    const mx = 1 - nx;
    const my = ny;
    let hit = false;
    let dead: { nx: number; ny: number } | undefined;

    for (const s of soldiers) {
      if (!s.alive || s.side !== mySide || s.foreign) continue;
      const a = px(s.nx, s.ny);
      const b = px(mx, my);
      if (Math.hypot(a.x - b.x, a.y - b.y) <= HIT_R + BLOT_R * 0.4) {
        s.alive = false;
        hit = true;
        dead = { nx: s.nx, ny: s.ny };
        break;
      }
    }

    myRemaining = countAlive(mySide);
    const shooter: Side = mySide === "left" ? "right" : "left";

    // Record blot from shooter's perspective coords
    blots.push({
      nx,
      ny,
      r: BLOT_R,
      from: shooter,
      mx,
      my,
      hit,
    });
    lastResult = hit ? "kena" : "miss";

    link?.send({
      type: "fold-result",
      hit,
      defenderRemaining: myRemaining,
      dead,
    });

    // Reveal on my side (defender sees the blot land)
    phase = "reveal";
    revealSide = mySide;
    updateHud();
    scheduleDraw();

    if (revealTimer !== null) window.clearTimeout(revealTimer);
    revealTimer = window.setTimeout(() => {
      revealTimer = null;
      revealSide = null;
      if (myRemaining <= 0) {
        phase = "over";
        winner = shooter;
        link?.send({
          type: "game-over",
          winner: shooter === "left" ? "host" : "guest",
        });
      } else {
        phase = "ink";
        turn = mySide; // defender shoots next
      }
      updateHud();
      scheduleDraw();
    }, 1600);
  }

  function onNetMsg(msg: NetMsg): void {
    switch (msg.type) {
      case "ready-ping":
        // Peer announced itself; pairing is handled by the room link.
        break;
      case "deploy-done":
        theyDeployed = true;
        maybeStartOnlineInk();
        break;
      case "dot":
        // I am defender this turn
        handleIncomingDot(msg.nx, msg.ny);
        break;
      case "fold-result": {
        // I was shooter — apply result without ever learning living positions
        if (!pendingDot) break;
        const { nx, ny, side } = pendingDot;
        const mx = 1 - nx;
        const my = ny;
        theirRemaining = msg.defenderRemaining;
        if (msg.dead) {
          soldiers.push({
            id: nextId++,
            side: side === "left" ? "right" : "left",
            nx: msg.dead.nx,
            ny: msg.dead.ny,
            alive: false,
            foreign: true,
          });
        }
        finishDotLocal({
          nx,
          ny,
          side,
          mx,
          my,
          hit: msg.hit,
          deadPos: msg.dead ?? null,
        });
        break;
      }
      case "game-over": {
        phase = "over";
        winner =
          msg.winner === "draw"
            ? "draw"
            : msg.winner === "host"
              ? "left"
              : "right";
        updateHud();
        scheduleDraw();
        break;
      }
      case "play-again":
        beginOnlineDeploy();
        break;
      default:
        break;
    }
  }

  function onPointerDown(e: PointerEvent): void {
    if (
      phase === "folding" ||
      phase === "reveal" ||
      phase === "over" ||
      phase === "menu" ||
      phase === "lobby"
    )
      return;
    if (mode === "online" && phase === "deploy" && iDeployed) return;
    if (mode === "online" && phase === "ink" && turn !== mySide) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const { nx, ny } = toN(x, y);

    if (phase === "deploy") {
      const side = mode === "online" ? mySide : deploySide;
      placeSoldierN(nx, ny, side);
      return;
    }
    if (phase === "ink") tryPlaceDotN(nx, ny);
  }

  function scheduleDraw(): void {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      if (phase === "menu" || phase === "lobby") return;
      paint();
    });
  }

  function paint(): void {
    if (!canvas) return;
    const width = w();
    const height = h();
    const fx = foldX();
    const open = visibleSide();
    const showAll = bothSidesOpen();

    ctx.clearRect(0, 0, width, height);
    const g = ctx.createLinearGradient(0, 0, width, height);
    g.addColorStop(0, "#fbfaf6");
    g.addColorStop(1, "#f1eee4");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(70,84,100,0.045)";
    for (let y = 48; y < height; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(106,154,139,0.05)";
    ctx.fillRect(0, 0, fx, height);
    ctx.fillStyle = "rgba(176,137,104,0.06)";
    ctx.fillRect(fx, 0, width - fx, height);

    ctx.strokeStyle = "rgba(47,55,66,0.4)";
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(fx + 0.5, 16);
    ctx.lineTo(fx + 0.5, height - 16);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "rgba(47,55,66,0.5)";
    ctx.font = "700 13px Nunito, sans-serif";
    ctx.fillText("LEFT", 20, 28);
    ctx.fillText("RIGHT", width - 70, 28);

    for (const b of blots) {
      const ownSide = b.from;
      const landSide: Side = b.mx < 0.5 ? "left" : "right";
      if (showAll || ownSide === open) {
        const p = px(b.nx, b.ny);
        drawBlot(ctx, p.x, p.y, b.r * 0.85, "rgba(43,95,158,0.35)");
      }
      if (showAll || landSide === open) {
        const p = px(b.mx, b.my);
        drawBlot(ctx, p.x, p.y, b.r, "rgba(43,95,158,0.8)");
      }
    }

    for (const s of soldiers) {
      if (!showAll && s.side !== open) continue;
      if (!showAll && phase === "reveal" && s.alive) continue;
      // Online: never draw living foreign soldiers (they shouldn't exist anyway)
      if (s.foreign && s.alive) continue;
      const p = px(s.nx, s.ny);
      drawStickman(ctx, p.x, p.y, s.alive, s.side);
    }

    if (!showAll) {
      ctx.fillStyle = "#e7e2d6";
      if (open === "right") {
        ctx.fillRect(0, 0, fx, height);
        stamp(ctx, fx / 2, height / 2, "Opponent side hidden");
      } else {
        ctx.fillRect(fx, 0, width - fx, height);
        stamp(ctx, fx + (width - fx) / 2, height / 2, "Opponent side hidden");
      }
      ctx.strokeStyle = "rgba(47,55,66,0.35)";
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(fx + 0.5, 16);
      ctx.lineTo(fx + 0.5, height - 16);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (phase === "folding" && pendingDot) {
      const mx = 1 - pendingDot.nx;
      const tnx = pendingDot.nx + (mx - pendingDot.nx) * foldT;
      const p = px(tnx, pendingDot.ny);
      drawBlot(
        ctx,
        p.x,
        p.y,
        BLOT_R * (0.9 + 0.15 * Math.sin(foldT * Math.PI)),
      );
    }

    if (phase === "reveal" && lastResult) {
      ctx.save();
      ctx.font = "800 28px Nunito, sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle =
        lastResult === "kena"
          ? "rgba(63,111,98,0.9)"
          : "rgba(176,137,104,0.9)";
      const cx = open === "left" ? fx / 2 : fx + (width - fx) / 2;
      ctx.fillText(lastResult === "kena" ? "HIT!" : "miss", cx, 56);
      ctx.restore();
    }
  }

  function resize(): void {
    if (!canvas) return;
    const stage = canvas.parentElement!;
    canvas.width = Math.max(1, Math.floor(stage.clientWidth));
    canvas.height = Math.max(360, Math.floor(stage.clientHeight || 480));
    scheduleDraw();
    updateHud();
  }

  const onResize = () => resize();
  window.addEventListener("resize", onResize);

  goMenu();

  return () => {
    destroyLink();
    cancelAnimationFrame(raf);
    cancelAnimationFrame(foldRaf);
    if (revealTimer !== null) window.clearTimeout(revealTimer);
    window.removeEventListener("resize", onResize);
    root.innerHTML = "";
  };
}

function stamp(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
): void {
  ctx.save();
  ctx.fillStyle = "rgba(47,55,66,0.2)";
  ctx.font = "700 16px Nunito, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(text, x, y);
  ctx.font = "600 12px IBM Plex Mono, monospace";
  ctx.fillText("(no peeking)", x, y + 22);
  ctx.restore();
}

function drawBlot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color = "rgba(43,95,158,0.8)",
): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, r * 1.05, r * 0.9, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawStickman(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  alive: boolean,
  side: Side,
): void {
  ctx.save();
  ctx.strokeStyle = alive ? "#2b5f9e" : "rgba(47,55,66,0.28)";
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  if (!alive) ctx.setLineDash([3, 3]);

  ctx.beginPath();
  ctx.arc(x, y - 16, 7, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y - 9);
  ctx.lineTo(x, y + 8);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 10, y - 1);
  ctx.lineTo(x + 10, y - 1);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y + 8);
  ctx.lineTo(x - 8, y + 20);
  ctx.moveTo(x, y + 8);
  ctx.lineTo(x + 8, y + 20);
  ctx.stroke();

  if (alive) {
    ctx.fillStyle =
      side === "left" ? "rgba(106,154,139,0.95)" : "rgba(176,137,104,0.95)";
    ctx.fillRect(x + 8, y - 20, 8, 6);
  } else {
    ctx.fillStyle = "rgba(43,95,158,0.35)";
    ctx.beginPath();
    ctx.ellipse(x, y + 4, 14, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
