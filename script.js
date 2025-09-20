// 초기 상태 및 상수
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const saveScoreBtn = document.getElementById('saveScoreBtn');
const closeBtn = document.getElementById('closeBtn'); // X 버튼 추가
const playerNameInput = document.getElementById('playerName');
const startScreen = document.getElementById('startScreen');
const gameArea = document.getElementById('gameArea');
const gameOverScreen = document.getElementById('gameOverScreen');
const gridContainer = document.getElementById('gridContainer');
const roundDisplay = document.getElementById('roundDisplay');
const timeDisplay = document.getElementById('timeDisplay');
const finalRoundSpan = document.getElementById('finalRound');
const leaderboardList = document.getElementById('leaderboardList');
const leaderboardListGameOver = document.getElementById('leaderboardListGameOver');
const topBar = document.getElementById('topBar');
const timeBar = document.getElementById('timeBar');
const timeBarInner = document.getElementById('timeBarInner');
// 테마/카운트다운 엘리먼트
const themeToggle = document.getElementById('themeToggle');
const countdownOverlay = document.getElementById('countdownOverlay');
const countdownText = document.getElementById('countdownText');

let round = 1;
let timerId = null;
let timeLeft = 0;
let targetIndex = -1;
let playing = false;
let currentRoundTime = 0;
let countdown = false; // 카운트다운 상태 추가

const MAX_GRID = 5; // 최대 5x5
const BASE_TIME = 10 ; // 1라운드 시간 (초)

function calcGridSize(r){
  // 2x2는 2라운드, 3x3은 3라운드, 4x4는 4라운드, 5x5는 5라운드 동안 유지
  // 예) r=1~2 -> 2, r=3~5 -> 3, r=6~9 -> 4, r=10~14 -> 5, 이후 계속 5
  let size = 2;
  let remaining = r;
  while (remaining > size && size < MAX_GRID) {
    remaining -= size;
    size++;
  }
  return size;
}

function calcTime(r){
  // 시작 10초, 3라운드마다 1초 감소, 최소 8초(최대 2초 감소)
  const dec = Math.min(2, Math.floor((r - 1) / 3));
  return BASE_TIME - dec;
}

function randomColor(){
  const h = Math.floor(Math.random()*360);
  const s = 55 + Math.floor(Math.random()*30); // 55~85
  const l = 45 + Math.floor(Math.random()*10); // 45~55
  return { h, s, l };
}

function colorToCss(c){
  // 일부 브라우저(구버전)에서 CSS Color Level 4 공백 구문 미지원 → 콤마 구문 사용
  return `hsl(${c.h}, ${c.s}%, ${c.l}%)`;
}

function similarColor(base, size){
  // 난이도 하향: 전반적으로 차이를 조금 더 키우되, 칸 수가 커질수록 다시 축소
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const lRanges = { 2:[6,10], 3:[5,8], 4:[4,6], 5:[3,5] };
  const sRanges = { 2:[4,6], 3:[3,5], 4:[2.5,4], 5:[1.5,3] };
  const [lmin, lmax] = lRanges[size] || [3,5];
  const [smin, smax] = sRanges[size] || [1.5,3];
  const deltaL = (Math.random() < .5 ? -1 : 1) * (lmin + Math.random() * (lmax - lmin));
  const deltaS = (Math.random() < .5 ? -1 : 1) * (smin + Math.random() * (smax - smin));
  return {
    h: base.h,
    s: clamp(base.s + deltaS, 20, 95),
    l: clamp(base.l + deltaL, 15, 90)
  };
}

function buildGrid(){
  const size = calcGridSize(round);
  gridContainer.innerHTML = '';
  gridContainer.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
  const base = randomColor();
  const diff = similarColor(base, size);
  targetIndex = Math.floor(Math.random() * size * size);
  const baseCss = colorToCss(base);
  const diffCss = colorToCss(diff);
  for(let i=0;i<size*size;i++){
    const div = document.createElement('button');
    div.className = 'cell';
    div.setAttribute('role','gridcell');
    div.style.background = (i === targetIndex) ? diffCss : baseCss;
    div.addEventListener('click', () => handleCellClick(i === targetIndex));
    gridContainer.appendChild(div);
  }
}

function handleCellClick(correct){
  if(!playing || countdown) return; // 카운트다운 중에는 클릭 무시
  if(correct){
    round++;
    nextRound();
  } else {
    endGame();
  }
}

function updateTimeBar(){
  if(!timeBarInner) return;
  const percent = Math.max(0, (timeLeft / currentRoundTime) * 100);
  timeBar.setAttribute('aria-valuenow', percent.toFixed(0));
  timeBarInner.style.width = percent + '%';
  if(percent < 35){
    timeBarInner.style.background = 'linear-gradient(90deg,#ff4e50,#d62929)';
  } else if(percent < 65){
    timeBarInner.style.background = 'linear-gradient(90deg,#feb47b,#ff9152)';
  } else {
    timeBarInner.style.background = 'linear-gradient(90deg,#3ddc97,#1fbf72)';
  }
}

function nextRound(){
  clearInterval(timerId);
  roundDisplay.textContent = String(round);
  currentRoundTime = calcTime(round);
  timeLeft = currentRoundTime;
  updateTimeBar();
  buildGrid();
  timerId = setInterval(() => {
    timeLeft--;
    updateTimeBar();
    if(timeLeft <= 0){
      endGame();
    }
  }, 1000);
}

// 카운트다운
async function runCountdown(){
  if(!countdownOverlay || !countdownText) return;
  
  countdown = true; // 카운트다운 시작
  document.body.classList.add('countdown-active'); // 비활성화 클래스 추가
  
  // 새로운 판을 미리 생성하고 블러 처리
  buildGrid();
  gameArea.style.filter = 'blur(8px)';
  
  countdownOverlay.classList.remove('hidden');
  const steps = ['3','2','1'];
  for(const s of steps){
    countdownText.textContent = s;
    await new Promise(res=>setTimeout(res, 900));
  }
  countdownOverlay.classList.add('hidden');
  
  // 블러 해제
  gameArea.style.filter = 'none';
  document.body.classList.remove('countdown-active'); // 비활성화 클래스 제거
  countdown = false; // 카운트다운 종료
}

// 시작 시 카운트다운 후 시작
async function startGame(){
  clearInterval(timerId);
  round = 1;
  playing = true;
  startScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
  gameArea.classList.remove('hidden');
  topBar.classList.remove('hidden');
  roundDisplay.textContent = '1';
  
  // 시간바 초기화
  currentRoundTime = calcTime(round);
  timeLeft = currentRoundTime;
  updateTimeBar();
  
  await runCountdown();
  
  // 카운트다운 후 타이머 시작
  timerId = setInterval(() => {
    timeLeft--;
    updateTimeBar();
    if(timeLeft <= 0) endGame();
  }, 1000);
}

function endGame(){
  if(!playing) return;
  playing = false;
  clearInterval(timerId);
  finalRoundSpan.textContent = String(round);
  // 화면 유지 + 블러 처리
  document.body.classList.add('blur-active');
  gameOverScreen.classList.remove('hidden');
  playerNameInput.value = '';
  playerNameInput.focus();
  renderLeaderboard();
}

const STORAGE_KEY = 'color_diff_leaderboard_v1';

function loadScores(){
  try { 
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; 
  }
  catch { 
    return []; 
  }
}

function saveScores(list){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0,15)));
}

function addScore(name, score){
  if(!name) return;
  const list = loadScores();
  list.push({ name: name.trim(), score, ts: Date.now() });
  list.sort((a,b)=> b.score - a.score || a.ts - b.ts);
  saveScores(list);
}

function renderLeaderboard(){
  const list = loadScores();
  function fill(ul){
    ul.innerHTML='';
    if(list.length===0){
      const li = document.createElement('li');
      li.textContent = '기록 없음';
      ul.appendChild(li);
      return;
    }
    list.forEach(item => {
      const li = document.createElement('li');
      li.textContent = `${item.name} - 라운드 ${item.score}`;
      ul.appendChild(li);
    });
  }
  fill(leaderboardList);
  fill(leaderboardListGameOver);
}

// 테마 토글 저장/적용
const THEME_KEY = 'color_diff_theme_v1';
function applyTheme(theme){
  if(theme === 'light') document.documentElement.classList.add('light');
  else document.documentElement.classList.remove('light');
  if(themeToggle) themeToggle.textContent = theme === 'light' ? '🌙 다크' : '☀ 라이트';
}
function initTheme(){
  const saved = localStorage.getItem(THEME_KEY) || 'dark';
  applyTheme(saved);
}
function toggleTheme(){
  const isLight = document.documentElement.classList.toggle('light');
  const theme = isLight ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
}

// 저장 후는 메인으로, 다시하기는 즉시 재시작
function saveCurrentScore(){
  const name = playerNameInput.value.trim();
  if(!name) return;
  addScore(name, round);
  renderLeaderboard();
  // 저장 후 시작 화면 복귀
  gameOverScreen.classList.add('hidden');
  document.body.classList.remove('blur-active');
  topBar.classList.add('hidden');
  startScreen.classList.remove('hidden');
  gameArea.classList.add('hidden');
}

// 메인화면으로 돌아가기
function goToMainScreen(){
  gameOverScreen.classList.add('hidden');
  document.body.classList.remove('blur-active');
  topBar.classList.add('hidden');
  startScreen.classList.remove('hidden');
  gameArea.classList.add('hidden');
}

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', async ()=>{
  if(playing) return;
  clearInterval(timerId); // 기존 타이머 정리
  document.body.classList.remove('blur-active');
  gameOverScreen.classList.add('hidden');
  await startGame();
});
saveScoreBtn.addEventListener('click', saveCurrentScore);
closeBtn.addEventListener('click', goToMainScreen); // X 버튼 이벤트 추가
playerNameInput.addEventListener('keydown', e=>{ if(e.key==='Enter') saveCurrentScore(); });

themeToggle && themeToggle.addEventListener('click', toggleTheme);
initTheme();

document.addEventListener('visibilitychange', ()=>{
  if(document.hidden && playing){
    endGame();
  }
});

// 페이지 로드 시 리더보드 렌더링
renderLeaderboard();

// 요소 존재 확인 & 전역 오류 로깅 추가 (디버깅용)
(function debugInit(){
  const required = { startBtn, restartBtn, saveScoreBtn, playerNameInput, startScreen, gameArea, gameOverScreen, gridContainer };
  const missing = Object.entries(required).filter(([,el])=>!el).map(([k])=>k);
  if(missing.length){
    console.error('필수 요소를 찾지 못했습니다:', missing.join(', '));
  }
  window.addEventListener('error', e=>{
    console.error('스크립트 오류:', e.message, e.filename+':'+e.lineno);
  });
  window.addEventListener('unhandledrejection', e=>{
    console.error('Promise 처리 안된 오류:', e.reason);
  });
})();
