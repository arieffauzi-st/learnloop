import "./style.css";
/**
 * LearnLoop port of ForFun `perang-kertas` — HOTSEAT ONLY.
 * The online (2 PC / MQTT) mode from the reference repo is intentionally not
 * wired in this PR: net/roomLink.ts is excluded so `mqtt` is never bundled.
 * (net/protocol.ts is ported verbatim for future online work.)
 */
export type PerangKertasOptions = {
  embedded?: boolean;
  onHome?: () => void;
};

type Side = "left" | "right";
type Phase = "menu" | "deploy" | "ink" | "folding" | "reveal" | "over";

type Soldier = {
  id: number;
  side: Side;
  nx: number;
  ny: number;
  alive: boolean;
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
  let phase: Phase = "menu";
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

  const shell = () => {
    root.innerHTML = `
    <div class="perang-kertas">
      <header class="topbar">
        <div class="brand">
          <div class="brand-kicker">LearnLoop · Perang Kertas</div>
          <h1>Perang Kertas</h1>
          <p>Lipat kertas, sembunyikan pasukanmu, dan coba tebak posisi lawan. Satu PC, main bergantian.</p>
        </div>
        ${
          options.embedded
            ? `<button type="button" class="btn ghost" id="homeBtn">← Menu utama</button>`
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

  function goMenu(): void {
    phase = "menu";
    renderMenu();
  }

  function renderMenu(): void {
    view().innerHTML = `
      <div class="pk-menu">
        <div class="card pk-menu-card">
          <h2>Pilih cara main</h2>
          <p class="explain">Mode yang tersedia: <strong>Satu PC (bergantian)</strong> — dua pemain berbagi satu layar, sisi lawan selalu tertutup supaya posisinya tetap rahasia.</p>
          <div class="btn-row" style="margin-top:1rem">
            <button type="button" class="btn" id="hotseat">Satu PC (bergantian)</button>
            <button type="button" class="btn warm" id="onlineSoon" disabled title="Segera hadir">Online · 2 PC (segera hadir)</button>
          </div>
          <p class="pk-note" id="menuErr"></p>
        </div>
      </div>
    `;
    view().querySelector("#hotseat")!.addEventListener("click", () => {
      startHotseat();
    });
  }

  function startHotseat(): void {
    resetMatchState();
    phase = "deploy";
    deploySide = "left";
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
            <h2>Cara main</h2>
            <ol class="steps">
              <li>Pasang <strong>${SOLDIERS_PER_SIDE} stickman</strong> di lapanganmu. Sisi lawan tertutup.</li>
              <li>Taruh <strong>dot tinta</strong> di kertasmu → dilipat ke lawan.</li>
              <li>Ulangi sampai <strong>semua</strong> pasukan lawan kena.</li>
              <li>Mode 1 PC · bergantian, tetap saling tutup sisi.</li>
            </ol>
            <div class="btn-row">
              <button type="button" class="btn warm" id="reset">Main lagi</button>
              <button type="button" class="btn ghost" id="toMenu">Ganti mode</button>
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
    view().querySelector("#reset")!.addEventListener("click", () => startHotseat());
    view().querySelector("#toMenu")!.addEventListener("click", goMenu);
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
    return soldiers.filter((s) => s.side === side && s.alive).length;
  }

  function deployedMine(): number {
    return soldiers.filter((s) => s.side === deploySide).length;
  }

  function visibleSide(): Side {
    if (phase === "deploy") return deploySide;
    if (phase === "folding" && pendingDot) return pendingDot.side;
    if (phase === "reveal" && revealSide) return revealSide;
    if (phase === "over") return "left";
    return turn;
  }

  function bothSidesOpen(): boolean {
    return phase === "over";
  }

  function updateHud(): void {
    if (phase === "menu") return;

    const leftN = countAlive("left");
    const rightN = countAlive("right");

    if (phase === "deploy") {
      const need = SOLDIERS_PER_SIDE - deployedMine();
      explainEl.textContent =
        deploySide === "left"
          ? `Pemain KIRI pasang stickman — ${need} lagi. Sisi kanan ditutup.`
          : `Pemain KANAN pasang stickman — ${need} lagi. Sisi kiri ditutup.`;
      hintEl.textContent = `Pasang · klik sisi ${deploySide === "left" ? "KIRI" : "KANAN"}`;
    } else if (phase === "ink") {
      const bit =
        lastResult === "kena"
          ? " Dot tadi KENA! "
          : lastResult === "miss"
            ? " Dot tadi meleset. "
            : " ";
      explainEl.textContent =
        turn === "left"
          ? `Giliran KIRI taruh tinta.${bit}Lawan tersisa ${rightN}.`
          : `Giliran KANAN taruh tinta.${bit}Lawan tersisa ${leftN}.`;
      hintEl.textContent = `Taruh dot · sisi ${turn === "left" ? "KIRI" : "KANAN"}`;
    } else if (phase === "folding") {
      explainEl.textContent = "Melipat kertas…";
      hintEl.textContent = "Lipat";
    } else if (phase === "reveal") {
      explainEl.textContent =
        lastResult === "kena" ? "KENA! Stickman gugur." : "Meleset.";
      hintEl.textContent = "Hasil lipatan";
    } else if (winner === "draw") {
      explainEl.textContent = "Seri.";
      hintEl.textContent = "Selesai";
    } else {
      explainEl.textContent =
        winner === "left" ? "KIRI menang!" : "KANAN menang!";
      hintEl.textContent = "Selesai";
    }

    statsEl.innerHTML = `
      <div class="stat"><span>Kiri tersisa</span><strong>${leftN}/${SOLDIERS_PER_SIDE}</strong></div>
      <div class="stat"><span>Kanan tersisa</span><strong>${rightN}/${SOLDIERS_PER_SIDE}</strong></div>
      <div class="stat"><span>Dot</span><strong>${blots.length}</strong></div>
    `;
  }

  function inOwnFieldN(nx: number, side: Side): boolean {
    if (side === "left") return nx >= MARGIN_N && nx < 0.5 - 0.012;
    return nx > 0.5 + 0.012 && nx <= 1 - MARGIN_N;
  }

  function placeSoldierN(nx: number, ny: number, side: Side): void {
    if (!inOwnFieldN(nx, side)) return;
    if (ny < MARGIN_N || ny > 1 - MARGIN_N) return;
    const mine = soldiers.filter((s) => s.side === side);
    if (mine.length >= SOLDIERS_PER_SIDE) return;
    for (const s of mine) {
      const a = px(s.nx, s.ny);
      const b = px(nx, ny);
      if (Math.hypot(a.x - b.x, a.y - b.y) < 28) return;
    }
    soldiers.push({ id: nextId++, side, nx, ny, alive: true });

    if (mine.length + 1 >= SOLDIERS_PER_SIDE) {
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

  function tryPlaceDotN(nx: number, ny: number): void {
    if (!inOwnFieldN(nx, turn)) return;
    if (ny < MARGIN_N || ny > 1 - MARGIN_N) return;

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
      if (!s.alive || s.side !== enemy) continue;
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
      updateHud();
      scheduleDraw();
    }, 1600);
  }

  function onPointerDown(e: PointerEvent): void {
    if (
      phase === "folding" ||
      phase === "reveal" ||
      phase === "over" ||
      phase === "menu"
    )
      return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const { nx, ny } = toN(x, y);

    if (phase === "deploy") {
      placeSoldierN(nx, ny, deploySide);
      return;
    }
    if (phase === "ink") tryPlaceDotN(nx, ny);
  }

  function scheduleDraw(): void {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      if (phase === "menu") return;
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
    ctx.fillText("KIRI", 20, 28);
    ctx.fillText("KANAN", width - 70, 28);

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
      const p = px(s.nx, s.ny);
      drawStickman(ctx, p.x, p.y, s.alive, s.side);
    }

    if (!showAll) {
      ctx.fillStyle = "#e7e2d6";
      if (open === "right") {
        ctx.fillRect(0, 0, fx, height);
        stamp(ctx, fx / 2, height / 2, "Sisi lawan tertutup");
      } else {
        ctx.fillRect(fx, 0, width - fx, height);
        stamp(ctx, fx + (width - fx) / 2, height / 2, "Sisi lawan tertutup");
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
      ctx.fillText(lastResult === "kena" ? "KENA!" : "meleset", cx, 56);
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
  ctx.fillText("(tidak boleh saling lihat)", x, y + 22);
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
