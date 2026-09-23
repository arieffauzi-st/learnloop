import './style.css';

export type HangmanOptions = {
  embedded?: boolean;
  onHome?: () => void;
};

type WordEntry = { word: string; hint: string };

/** ~40 kid-friendly English words with short hints. */
export const WORD_LIST: WordEntry[] = [
  { word: 'ANIMAL', hint: 'It says moo' },
  { word: 'APPLE', hint: 'A red or green fruit' },
  { word: 'BALLOON', hint: 'It floats up at parties' },
  { word: 'BANANA', hint: 'A yellow fruit monkeys love' },
  { word: 'BEACH', hint: 'Sand and waves live here' },
  { word: 'BICYCLE', hint: 'It has two wheels and pedals' },
  { word: 'BUTTERFLY', hint: 'A colorful insect with wings' },
  { word: 'CANDY', hint: 'Sweet and sugary treat' },
  { word: 'CAT', hint: 'It purrs and naps a lot' },
  { word: 'CLOUD', hint: 'Fluffy and white in the sky' },
  { word: 'DOLPHIN', hint: 'A smart sea mammal that jumps' },
  { word: 'DRAGON', hint: 'A giant fire-breathing lizard' },
  { word: 'EARTH', hint: 'The planet we live on' },
  { word: 'ELEPHANT', hint: 'A huge gray animal with a trunk' },
  { word: 'FISH', hint: 'It swims and has fins' },
  { word: 'FLOWER', hint: 'A pretty plant that blooms' },
  { word: 'FOX', hint: 'An orange animal with a bushy tail' },
  { word: 'GARDEN', hint: 'Where you grow vegetables' },
  { word: 'GUITAR', hint: 'A musical instrument with strings' },
  { word: 'HAPPY', hint: 'How you feel on your birthday' },
  { word: 'HONEY', hint: 'Sweet stuff bees make' },
  { word: 'JUNGLE', hint: 'A thick green forest' },
  { word: 'KITE', hint: 'It flies high on a string' },
  { word: 'LEMON', hint: 'A sour yellow fruit' },
  { word: 'MOON', hint: 'It glows in the night sky' },
  { word: 'MOUNTAIN', hint: 'A very tall, rocky place' },
  { word: 'OCEAN', hint: 'A giant body of salt water' },
  { word: 'OCTOPUS', hint: 'Eight arms live in the sea' },
  { word: 'ORANGE', hint: 'A fruit and a color' },
  { word: 'PANDA', hint: 'A bear that eats bamboo' },
  { word: 'PIZZA', hint: 'Cheesy slices everyone loves' },
  { word: 'RAINBOW', hint: 'Colors after the rain' },
  { word: 'ROBOT', hint: 'A machine that can walk and talk' },
  { word: 'ROCKET', hint: 'It blasts off to space' },
  { word: 'SCHOOL', hint: 'Where you go to learn' },
  { word: 'SUN', hint: 'It lights up the day' },
  { word: 'TRAIN', hint: 'It runs on rails' },
  { word: 'TURTLE', hint: 'Slow and steady, with a shell' },
  { word: 'WHALE', hint: 'The biggest animal in the sea' },
  { word: 'WINTER', hint: 'The season of snow' },
];

const MAX_WRONG = 6;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/** SVG stickman drawn progressively (6 parts). Gallows always visible. */
function stickmanSvg(wrongCount: number): string {
  const parts: string[] = [
    // gallows
    '<line x1="20" y1="180" x2="140" y2="180"/>',
    '<line x1="60" y1="180" x2="60" y2="20"/>',
    '<line x1="60" y1="20" x2="130" y2="20"/>',
    '<line x1="60" y1="50" x2="90" y2="20"/>',
  ];
  if (wrongCount >= 1) parts.push('<circle cx="130" cy="45" r="20" class="hm-body"/>'); // head
  if (wrongCount >= 2) parts.push('<line x1="130" y1="65" x2="130" y2="115"/>'); // body
  if (wrongCount >= 3) parts.push('<line x1="130" y1="78" x2="106" y2="98"/>'); // left arm
  if (wrongCount >= 4) parts.push('<line x1="130" y1="78" x2="154" y2="98"/>'); // right arm
  if (wrongCount >= 5) parts.push('<line x1="130" y1="115" x2="110" y2="150"/>'); // left leg
  if (wrongCount >= 6) parts.push('<line x1="130" y1="115" x2="150" y2="150"/>'); // right leg
  return `<svg viewBox="0 0 180 200" class="hm-stickman" role="img" aria-label="Hangman drawing">${parts.join('')}</svg>`;
}

export function createHangman(root: HTMLElement, options: HangmanOptions = {}): () => void {
  let disposed = false;
  let answer = '';
  let hint = '';
  let guessed = new Set<string>();
  let wrong = 0;
  let status: 'playing' | 'won' | 'lost' = 'playing';

  root.classList.add('hangman-host');

  function pickWord(): void {
    const entry = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)]!;
    answer = entry.word;
    hint = entry.hint;
    guessed = new Set();
    wrong = 0;
    status = 'playing';
  }

  function wordDisplay(): string {
    return answer
      .split('')
      .map((ch) => (guessed.has(ch) ? `<span class="hm-letter on">${ch}</span>` : `<span class="hm-letter">${status === 'lost' ? ch : ''}</span>`))
      .join('');
  }

  function render(): void {
    if (disposed) return;
    const won = status === 'won';
    const lost = status === 'lost';
    root.innerHTML = `
      <div class="hangman-game">
        <header class="topbar">
          <div class="brand">
            <div class="brand-kicker">LearnLoop · Word Hangman</div>
            <h1>Word Hangman 🎩</h1>
            <p>Guess the secret word one letter at a time. You can be wrong ${MAX_WRONG} times.</p>
          </div>
          ${options.embedded ? '<button type="button" class="hm-btn ghost" id="hmHome">← Games hub</button>' : ''}
        </header>
        <div class="hm-board">
          ${stickmanSvg(wrong)}
          <div class="hm-side">
            <div class="hm-wrong">Wrong guesses: <strong>${wrong} / ${MAX_WRONG}</strong></div>
            <p class="hm-hint">💡 Hint: ${hint}</p>
            <div class="hm-word" aria-label="Secret word">${wordDisplay()}</div>
            ${won ? '<p class="hm-msg win">🎉 You did it! Great guessing!</p>' : ''}
            ${lost ? `<p class="hm-msg lose">😅 Oh no! The word was <strong>${answer}</strong>. Try again!</p>` : ''}
            ${
              won || lost
                ? '<button type="button" class="hm-btn big" id="hmAgain">🔄 Play again</button>'
                : '<div class="hm-keyboard" id="hmKeyboard" role="group" aria-label="Letter keyboard"></div>'
            }
          </div>
        </div>
      </div>
    `;

    root.querySelector('#hmHome')?.addEventListener('click', () => options.onHome?.());

    const againBtn = root.querySelector('#hmAgain');
    againBtn?.addEventListener('click', () => {
      pickWord();
      render();
    });

    const kb = root.querySelector<HTMLElement>('#hmKeyboard');
    if (kb && status === 'playing') {
      kb.innerHTML = ALPHABET.map((ch) => {
        const used = guessed.has(ch);
        const cls = used ? (answer.includes(ch) ? 'on correct' : 'on wrong-letter') : '';
        return `<button type="button" class="hm-key ${cls}" data-letter="${ch}" ${used ? 'disabled' : ''} aria-label="Letter ${ch}">${ch}</button>`;
      }).join('');
      kb.querySelectorAll<HTMLButtonElement>('.hm-key').forEach((btn) => {
        btn.addEventListener('click', () => guess(btn.dataset.letter ?? ''));
      });
    }
  }

  function guess(letter: string): void {
    if (status !== 'playing' || guessed.has(letter)) return;
    guessed.add(letter);
    if (answer.includes(letter)) {
      if (answer.split('').every((ch) => guessed.has(ch))) status = 'won';
    } else {
      wrong += 1;
      if (wrong >= MAX_WRONG) status = 'lost';
    }
    render();
  }

  function onKeyDown(e: KeyboardEvent): void {
    const ch = e.key.toUpperCase();
    if (ALPHABET.includes(ch)) guess(ch);
  }

  pickWord();
  render();
  window.addEventListener('keydown', onKeyDown);

  return () => {
    disposed = true;
    window.removeEventListener('keydown', onKeyDown);
    root.classList.remove('hangman-host');
    root.innerHTML = '';
  };
}
