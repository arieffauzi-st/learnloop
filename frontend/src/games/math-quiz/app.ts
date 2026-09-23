import './style.css';

export type MathQuizOptions = {
  embedded?: boolean;
  onHome?: () => void;
};

type Question = {
  text: string;
  choices: number[];
  answer: number;
};

const QUESTIONS_PER_ROUND = 10;
const SECONDS_PER_QUESTION = 20;

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeQuestion(): Question {
  const kind = randInt(0, 2); // 0 add, 1 sub, 2 mul
  let a: number;
  let b: number;
  let op: string;
  let result: number;
  if (kind === 0) {
    a = randInt(1, 50);
    b = randInt(1, 50);
    op = '+';
    result = a + b;
  } else if (kind === 1) {
    a = randInt(1, 50);
    b = randInt(1, 50);
    if (b > a) [a, b] = [b, a]; // keep results non-negative for kids
    op = '−';
    result = a - b;
  } else {
    a = randInt(1, 10);
    b = randInt(1, 10);
    op = '×';
    result = a * b;
  }
  const choices = new Set<number>([result]);
  while (choices.size < 4) {
    const delta = randInt(1, Math.max(6, Math.ceil(Math.abs(result) * 0.3)));
    const cand = Math.random() < 0.5 ? result + delta : result - delta;
    if (cand >= 0 && cand !== result) choices.add(cand);
  }
  return {
    text: `${a} ${op} ${b} = ?`,
    answer: result,
    choices: shuffle([...choices]),
  };
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

export function starsForScore(correct: number, total = QUESTIONS_PER_ROUND): number {
  if (correct >= total - 1) return 3; // 9-10
  if (correct >= Math.ceil(total * 0.6)) return 2; // 6-8
  if (correct >= Math.ceil(total * 0.3)) return 1; // 3-5
  return 0;
}

export function createMathQuiz(root: HTMLElement, options: MathQuizOptions = {}): () => void {
  let disposed = false;
  let questions: Question[] = [];
  let index = 0;
  let correctCount = 0;
  let answered = false;
  let timeLeft = SECONDS_PER_QUESTION;
  let tick: number | null = null;

  root.classList.add('mathquiz-host');

  function startRound(): void {
    questions = Array.from({ length: QUESTIONS_PER_ROUND }, makeQuestion);
    index = 0;
    correctCount = 0;
    render();
  }

  function stopTimer(): void {
    if (tick !== null) {
      window.clearInterval(tick);
      tick = null;
    }
  }

  function startTimer(): void {
    stopTimer();
    timeLeft = SECONDS_PER_QUESTION;
    updateTimer();
    tick = window.setInterval(() => {
      if (disposed || answered) return;
      timeLeft -= 1;
      updateTimer();
      if (timeLeft <= 0) {
        stopTimer();
        resolve(-1); // timeout counts as wrong
      }
    }, 1000);
  }

  function updateTimer(): void {
    const label = root.querySelector('.mq-time');
    const ring = root.querySelector<SVGCircleElement>('.mq-ring');
    if (label) label.textContent = `${timeLeft}s`;
    if (ring) {
      const frac = timeLeft / SECONDS_PER_QUESTION;
      ring.style.strokeDashoffset = String(282.7 * (1 - frac));
      ring.style.stroke = timeLeft <= 5 ? 'var(--mq-coral)' : 'var(--mq-sunny)';
    }
  }

  function render(): void {
    if (disposed) return;
    if (index >= QUESTIONS_PER_ROUND) {
      renderScore();
      return;
    }
    const q = questions[index]!;
    answered = false;
    root.innerHTML = `
      <div class="mathquiz">
        <header class="topbar">
          <div class="brand">
            <div class="brand-kicker">LearnLoop · Quick Math</div>
            <h1>Quick Math ⚡</h1>
            <p>Answer 10 questions as fast as you can. You get ${SECONDS_PER_QUESTION} seconds each!</p>
          </div>
          ${options.embedded ? '<button type="button" class="mq-btn ghost" id="mqHome">← Games hub</button>' : ''}
        </header>
        <div class="mq-card">
          <div class="mq-toprow">
            <div class="mq-progressbar" aria-label="Progress"><div class="mq-progressfill" style="width:${(index / QUESTIONS_PER_ROUND) * 100}%"></div></div>
            <div class="mq-count">Question ${index + 1}/${QUESTIONS_PER_ROUND}</div>
            <div class="mq-timer" role="timer">
              <svg viewBox="0 0 100 100" class="mq-ringwrap" aria-hidden>
                <circle cx="50" cy="50" r="45" class="mq-ringtrack"/>
                <circle cx="50" cy="50" r="45" class="mq-ring"/>
              </svg>
              <span class="mq-time">${SECONDS_PER_QUESTION}s</span>
            </div>
          </div>
          <div class="mq-question" aria-label="Math question">${q.text}</div>
          <div class="mq-choices" id="mqChoices" role="group" aria-label="Answer choices">
            ${q.choices.map((c) => `<button type="button" class="mq-btn choice" data-value="${c}">${c}</button>`).join('')}
          </div>
          <div class="mq-feedback" id="mqFeedback" aria-live="polite"></div>
        </div>
      </div>
    `;
    root.querySelector('#mqHome')?.addEventListener('click', () => options.onHome?.());
    root.querySelectorAll<HTMLButtonElement>('.mq-btn.choice').forEach((btn) => {
      btn.addEventListener('click', () => resolve(Number(btn.dataset.value)));
    });
    startTimer();
  }

  function resolve(picked: number): void {
    if (answered || disposed) return;
    answered = true;
    stopTimer();
    const q = questions[index]!;
    const isRight = picked === q.answer;
    if (isRight) correctCount += 1;
    root.querySelectorAll<HTMLButtonElement>('.mq-btn.choice').forEach((btn) => {
      const v = Number(btn.dataset.value);
      btn.disabled = true;
      if (v === q.answer) btn.classList.add('correct');
      else if (v === picked) btn.classList.add('incorrect');
    });
    const fb = root.querySelector<HTMLElement>('#mqFeedback');
    if (fb) {
      fb.textContent = isRight ? '✅ Correct! Great job!' : picked === -1 ? '⏰ Time is up! The answer was ' + q.answer : '❌ Oops! The answer was ' + q.answer;
      fb.className = `mq-feedback ${isRight ? 'right' : 'wrongfb'}`;
    }
    window.setTimeout(() => {
      if (disposed) return;
      index += 1;
      render();
    }, 1200);
  }

  function renderScore(): void {
    if (disposed) return;
    const stars = starsForScore(correctCount);
    const starsText = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
    const praise = stars === 3 ? 'Amazing! You are a math star! 🌟' : stars === 2 ? 'Great work! Keep it up! 👏' : stars === 1 ? 'Good try! Practice makes perfect! 💪' : 'Nice effort! Try again! 🚀';
    root.innerHTML = `
      <div class="mathquiz">
        <header class="topbar">
          <div class="brand">
            <div class="brand-kicker">LearnLoop · Quick Math</div>
            <h1>Quick Math ⚡</h1>
          </div>
          ${options.embedded ? '<button type="button" class="mq-btn ghost" id="mqHome">← Games hub</button>' : ''}
        </header>
        <div class="mq-card score">
          <div class="mq-stars" aria-label="${stars} of 3 stars">${starsText}</div>
          <h2 class="mq-scoretitle">${praise}</h2>
          <p class="mq-scoreshow">You got <strong>${correctCount} / ${QUESTIONS_PER_ROUND}</strong> correct!</p>
          <button type="button" class="mq-btn big" id="mqAgain">🔄 Play again</button>
        </div>
      </div>
    `;
    root.querySelector('#mqHome')?.addEventListener('click', () => options.onHome?.());
    root.querySelector('#mqAgain')?.addEventListener('click', startRound);
  }

  startRound();

  return () => {
    disposed = true;
    stopTimer();
    root.classList.remove('mathquiz-host');
    root.innerHTML = '';
  };
}
