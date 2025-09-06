console.log('game.js loaded');

// Firebase Initialization
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, collection, addDoc, query, orderBy, limit, onSnapshot } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getAnalytics, logEvent, setUserProperties } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-analytics.js";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCB2K1A1RnyW-CgdpqxqMQpNCa8q4QGbb0",
  authDomain: "zhongkuigame.firebaseapp.com",
  projectId: "zhongkuigame",
  storageBucket: "zhongkuigame.firebasestorage.app",
  messagingSenderId: "1033593706121",
  appId: "1:1033593706121:web:d08d00fa21aaca9e6fd858",
  measurementId: "G-D8MV3EJCHL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const analytics = getAnalytics(app);

// DOM element references
const startScreen = document.getElementById('start-screen');
const startButton = document.getElementById('start-button');
const resumeButton = document.getElementById('resume-button');
const leaderboardButton = document.getElementById('leaderboard-button');
const gameLeaderboardButton = document.getElementById('game-leaderboard-button');
const nameInputScreen = document.getElementById('name-input-screen');
const nameInput = document.getElementById('name-input');
const nameSubmitButton = document.getElementById('name-submit-button');
const leaderboardScreen = document.getElementById('leaderboard-screen');
const leaderboardBackButton = document.getElementById('leaderboard-back-button');
const characterSelection = document.getElementById('character-selection');
const gameArea = document.getElementById('game-area');
const controls = document.getElementById('controls');
const restartContainer = document.getElementById('restart-container');
const character = document.getElementById('character');
const scoreDisplay = document.getElementById('score');
const lifeDisplay = document.getElementById('life');
const levelDisplay = document.getElementById('level');
const gameOverDisplay = document.getElementById('game-over');
const gameOverOverlay = document.getElementById('game-over-overlay');
const leftButton = document.getElementById('left-button');
const rightButton = document.getElementById('right-button');
const restartButton = document.getElementById('restart-button');
const bgMusic = document.getElementById('bg-music');
const addressContainer = document.getElementById('address-container');
const addressText = document.getElementById('address-text');
const copyButton = document.getElementById('copy-button');
const copyToast = document.getElementById('copy-toast');

// Validate critical DOM elements
const missingElements = [];
if (!startScreen) missingElements.push('start-screen');
if (!startButton) missingElements.push('start-button');
if (!resumeButton) missingElements.push('resume-button');
if (!leaderboardButton) missingElements.push('leaderboard-button');
if (!gameLeaderboardButton) missingElements.push('game-leaderboard-button');
if (!nameInputScreen) missingElements.push('name-input-screen');
if (!nameInput) missingElements.push('name-input');
if (!nameSubmitButton) missingElements.push('name-submit-button');
if (!leaderboardScreen) missingElements.push('leaderboard-screen');
if (!leaderboardBackButton) missingElements.push('leaderboard-back-button');
if (!characterSelection) missingElements.push('character-selection');
if (!gameArea) missingElements.push('game-area');
if (!character) missingElements.push('character');
if (!scoreDisplay) missingElements.push('score');
if (!lifeDisplay) missingElements.push('life');
if (!levelDisplay) missingElements.push('level');
if (!gameOverDisplay) missingElements.push('game-over');
if (!gameOverOverlay) missingElements.push('game-over-overlay');
if (!addressContainer) missingElements.push('address-container');
if (!addressText) missingElements.push('address-text');
if (!copyButton) missingElements.push('copy-button');
if (missingElements.length > 0) {
    console.error(`Missing DOM elements: ${missingElements.join(', ')}`);
    document.body.innerHTML = `<div style="color: red; text-align: center; padding: 20px;">
        错误：无法找到必要的页面元素 (${missingElements.join(', ')})。请检查HTML结构并刷新页面。
    </div>`;
    throw new Error(`Missing DOM elements: ${missingElements.join(', ')}`);
}

// Anonymous Authentication
let currentUser = null;
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        console.log('User signed in anonymously:', user.uid);
        try {
            logEvent(analytics, 'login', { method: 'anonymous' });
        } catch (error) {
            console.error('Analytics login event failed:', error);
        }
        if (localStorage.getItem('gameSession')) {
            resumeButton.style.display = 'inline-block';
        }
    } else {
        console.log('No user signed in, attempting anonymous login');
        signInAnonymously(auth).catch(error => {
            console.error('Anonymous authentication failed:', error, error.stack);
            showError('无法登录游戏，请检查网络连接并刷新页面。');
        });
    }
});

// Copy button functionality
copyButton.addEventListener('click', () => {
    try {
        const fullAddress = addressText.dataset.fullAddress || addressText.textContent;
        navigator.clipboard.writeText(fullAddress).then(() => {
            copyButton.textContent = '已复制!';
            copyButton.style.backgroundColor = 'rgba(50, 205, 50, 0.9)';
            if (copyToast) {
                copyToast.classList.add('show');
                setTimeout(() => copyToast.classList.remove('show'), 2000);
            }
            setTimeout(() => {
                copyButton.textContent = '复制';
                copyButton.style.backgroundColor = 'rgba(255, 215, 0, 0.9)';
            }, 2000);
        }).catch(err => {
            console.error('复制失败:', err, err.stack);
            showError('无法复制地址，请手动复制。');
        });
    } catch (error) {
        console.error('Copy button error:', error, error.stack);
        showError('复制功能出错，请手动复制地址。');
    }
});

// Game configuration
const isMobile = /Mobi|Android/i.test(navigator.userAgent);
const gameConfig = {
    medium: {
        maxLife: 5,
        initialSpawnInterval: 2000,
        spawnIntervalDecrease: 25,
        minSpawnInterval: 500,
        moveSpeed: 5,
        initialFallDuration: 6,
        fallDurationDecrease: 0.3,
        minFallDuration: 2,
        maxCoins: (level) => isMobile ? Math.min(3, Math.floor(level / 2) + 2) : Math.min(6, Math.floor(level / 2) + 4),
    },
};

let currentConfig = gameConfig.medium;
let score = 0;
let life = currentConfig.maxLife;
let level = 1;
let coinCount = 0;
let spawnInterval = currentConfig.initialSpawnInterval;
let isGameOver = false;
let lastSpawnTime = 0;
let characterX = 50;
let isFacingRight = true;
let moveDirection = 0;
let lastCollisionCheck = 0;
let lastFrameTime = 0;
let lastSessionSave = 0;
let playerNameOrAddress = '';
let playerFullAddress = null;
const collisionCheckInterval = 250;
const sessionSaveInterval = 1000;
const coins = [];
const explosionPool = [];
const maxExplosionPoolSize = 10;
let gameAreaRect = null;
let cachedCharacterRect = null;
let lastBackgroundUpdateLife = life;
let selectedCharacterImage = 'https://raw.githubusercontent.com/annashen0805-art/zhongkui/main/characters.png';
let leaderboardListener = null;

// Fallback images
const fallbackCharacterImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGURgAAAABJRU5ErkJggg==';
const fallbackCoinImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHogJ/PdX9BAAAAABJRU5ErkJggg==';

// Preload images
const preloadImages = [
    'https://raw.githubusercontent.com/annashen0805-art/zhongkui/main/characters.png',
    'https://raw.githubusercontent.com/annashen0805-art/zhongkui/main/characters2.png',
    'https://raw.githubusercontent.com/annashen0805-art/zhongkui/main/coin.png',
    'https://raw.githubusercontent.com/annashen0805-art/zhongkui/main/gameareabackground.jpg',
    'https://raw.githubusercontent.com/annashen0805-art/zhongkui/main/bodybackground.jpg',
];
preloadImages.forEach(src => {
    const img = new Image();
    img.src = src;
    img.onerror = () => {
        console.error(`Failed to load image: ${src}`);
        if (src.includes('characters.png')) {
            character.style.backgroundImage = `url("${fallbackCharacterImage}")`;
        } else if (src.includes('coin.png')) {
            coins.forEach(coin => {
                coin.style.backgroundImage = `url("${fallbackCoinImage}")`;
            });
        } else if (src.includes('gameareabackground.jpg')) {
            gameArea.style.background = 'linear-gradient(to bottom, rgba(255, 102, 102, 0), rgba(255, 255, 255, 0.1))';
        } else if (src.includes('bodybackground.jpg')) {
            document.body.style.background = '#000';
        }
    };
});
bgMusic.load();
bgMusic.volume = 0.3;
bgMusic.onerror = () => {
    console.error('Failed to load audio: https://zhongkui-okayplay.com/zhongkui.mp3');
};

// Leaderboard functions
function truncateAddress(address) {
    if (!address || !address.startsWith('0x')) return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

async function saveHighScore(score, nameOrAddress, fullAddress) {
    try {
        if (!currentUser) {
            throw new Error('User not authenticated');
        }
        const highScoresRef = collection(db, 'highScores');
        await addDoc(highScoresRef, {
            nameOrAddress: truncateAddress(nameOrAddress),
            fullAddress,
            score,
            timestamp: new Date().toISOString(),
            userId: currentUser.uid
        });
        console.log('High score saved:', { nameOrAddress, fullAddress, score, userId: currentUser.uid });
    } catch (error) {
        console.error('Failed to save high score:', error, error.stack);
        showError('无法保存高分，请检查网络连接并重试。');
    }
}

function updateLeaderboardDisplay(highScores) {
    try {
        const leaderboardBody = document.getElementById('leaderboard-body');
        leaderboardBody.innerHTML = '';
        highScores.forEach((entry, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${entry.nameOrAddress}</td>
                <td>${entry.score}</td>
            `;
            leaderboardBody.appendChild(row);
        });
    } catch (error) {
        console.error('Failed to update leaderboard display:', error, error.stack);
        showError('无法更新排行榜，请检查网络连接并重试。');
    }
}

function setupLeaderboardListener() {
    try {
        const highScoresRef = collection(db, 'highScores');
        const q = query(highScoresRef, orderBy('score', 'desc'), limit(10));
        leaderboardListener = onSnapshot(q, (snapshot) => {
            const highScores = [];
            snapshot.forEach(doc => highScores.push(doc.data()));
            if (leaderboardScreen.classList.contains('show')) {
                updateLeaderboardDisplay(highScores);
            }
        }, (error) => {
            console.error('Leaderboard listener error:', error, error.stack);
            showError('无法实时更新排行榜，请检查网络连接。');
        });
    } catch (error) {
        console.error('Failed to setup leaderboard listener:', error, error.stack);
    }
}

// Session management functions
function saveSession() {
    try {
        const session = {
            score,
            life,
            level,
            characterX,
            isFacingRight,
            spawnInterval,
            selectedCharacterImage,
            playerNameOrAddress,
            playerFullAddress,
            coins: coins.map(coin => ({
                left: parseFloat(coin.style.left) || 0,
                top: parseFloat(coin.style.top) || -70,
                fallDuration: parseFloat(coin.style.getPropertyValue('--fall-duration')) || currentConfig.initialFallDuration,
            })),
            timestamp: Date.now(),
        };
        localStorage.setItem('gameSession', JSON.stringify(session));
        console.log('Session saved:', session);
    } catch (error) {
        console.error('Failed to save session:', error, error.stack);
    }
}

function loadSession() {
    try {
        const sessionData = localStorage.getItem('gameSession');
        if (!sessionData) return false;
        const session = JSON.parse(sessionData);
        if (
            !session ||
            typeof session.score !== 'number' ||
            typeof session.life !== 'number' || session.life < 0 || session.life > currentConfig.maxLife ||
            typeof session.level !== 'number' || session.level < 1 ||
            typeof session.characterX !== 'number' || session.characterX < 9 || session.characterX > 91 ||
            typeof session.isFacingRight !== 'boolean' ||
            typeof session.spawnInterval !== 'number' || session.spawnInterval < currentConfig.minSpawnInterval ||
            typeof session.selectedCharacterImage !== 'string' ||
            typeof session.playerNameOrAddress !== 'string' ||
            !Array.isArray(session.coins) ||
            !session.timestamp || (Date.now() - session.timestamp > 3600000)
        ) {
            console.warn('Invalid or expired session data, clearing session');
            localStorage.removeItem('gameSession');
            return false;
        }

        coins.forEach(coin => {
            if (coin.parentNode) {
                coin.cleanup();
                coin.remove();
            }
        });
        coins.length = 0;
        coinCount = 0;

        score = session.score;
        life = session.life;
        level = session.level;
        characterX = session.characterX;
        isFacingRight = session.isFacingRight;
        spawnInterval = session.spawnInterval;
        selectedCharacterImage = session.selectedCharacterImage;
        playerNameOrAddress = session.playerNameOrAddress;
        playerFullAddress = session.playerFullAddress;
        character.style.backgroundImage = `url("${selectedCharacterImage}")`;
        character.style.left = `${characterX}%`;
        character.style.transform = `translateX(-50%) scaleX(${isFacingRight ? 1 : -1}) translateZ(0)`;
        if (scoreDisplay) scoreDisplay.textContent = `得分: ${score} | 最高分: -`;
        if (lifeDisplay) lifeDisplay.textContent = `生命: ${life}`;
        if (levelDisplay) levelDisplay.textContent = `等级: ${level}`;

        session.coins.forEach(coinData => {
            const coin = document.createElement('div');
            coin.classList.add('coin');
            coin.style.left = `${coinData.left}px`;
            coin.style.top = `${coinData.top}px`;
            coin.style.setProperty('--fall-duration', `${coinData.fallDuration}s`);
            gameArea.appendChild(coin);
            coins.push(coin);
            coinCount++;

            coin.onerror = () => {
                coin.style.backgroundImage = `url("${fallbackCoinImage}")`;
                console.warn('Coin image failed to load, using fallback.');
            };

            const handleAnimationEnd = (e) => {
                if (e.animationName === 'fall' && coin.parentNode) {
                    coin.cleanup();
                    coin.remove();
                    coins.splice(coins.indexOf(coin), 1);
                    coinCount--;
                    life--;
                    if (lifeDisplay) lifeDisplay.textContent = `生命: ${life}`;
                    if (life <= 0) gameOver();
                }
            };

            const handleClick = (e) => {
                e.stopPropagation();
                if (!isGameOver) collectCoin(coin);
            };

            coin.addEventListener('animationend', handleAnimationEnd);
            coin.addEventListener('click', handleClick);
            coin.cleanup = () => {
                try {
                    coin.removeEventListener('animationend', handleAnimationEnd);
                    coin.removeEventListener('click', handleClick);
                    coin.onerror = null;
                    coin.style.animation = 'none';
                } catch (error) {
                    console.error('Failed to clean up coin:', error, error.stack);
                }
            };
        });

        console.log('Session loaded:', session);
        return true;
    } catch (error) {
        console.error('Failed to load session:', error, error.stack);
        localStorage.removeItem('gameSession');
        return false;
    }
}

function clearSession() {
    try {
        localStorage.removeItem('gameSession');
        console.log('Session cleared');
    } catch (error) {
        console.error('Failed to clear session:', error, error.stack);
    }
}

function showNameInputScreen() {
    try {
        startScreen.classList.remove('show');
        nameInputScreen.classList.add('show');
        nameInput.value = '';
        nameInput.focus();
        console.log('Showing name input screen');
    } catch (error) {
        console.error('Failed to show name input screen:', error, error.stack);
        showError('无法显示名称输入界面，请刷新页面重试。');
    }
}

function showCharacterSelection() {
    try {
        nameInputScreen.classList.remove('show');
        characterSelection.style.display = 'block';
        console.log('Showing character selection screen');
    } catch (error) {
        console.error('Failed to show character selection:', error, error.stack);
        showError('无法显示角色选择界面，请刷新页面重试。');
    }
}

function showLeaderboardScreen(fromGame = false) {
    try {
        if (fromGame) {
            gameArea.style.display = 'none';
            controls.style.display = 'none';
            restartContainer.style.display = 'none';
            addressContainer.style.display = 'none';
            isGameOver = true;
            saveSession();
            bgMusic.pause();
            try {
                logEvent(analytics, 'view_leaderboard', { context: 'in_game' });
            } catch (error) {
                console.error('Analytics view_leaderboard event failed:', error);
            }
        } else {
            startScreen.classList.remove('show');
            try {
                logEvent(analytics, 'view_leaderboard', { context: 'start_screen' });
            } catch (error) {
                console.error('Analytics view_leaderboard event failed:', error);
            }
        }
        leaderboardScreen.classList.add('show');
        setupLeaderboardListener();
        console.log('Showing leaderboard screen');
    } catch (error) {
        console.error('Failed to show leaderboard screen:', error, error.stack);
        showError('无法显示排行榜，请检查网络连接并重试。');
    }
}

function hideLeaderboardScreen() {
    try {
        leaderboardScreen.classList.remove('show');
        if (leaderboardListener) {
            leaderboardListener();
            leaderboardListener = null;
        }
        if (gameArea.style.display === 'none' && !gameOverDisplay.style.display) {
            gameArea.style.display = 'block';
            controls.style.display = 'flex';
            restartContainer.style.display = 'flex';
            addressContainer.style.display = 'flex';
            isGameOver = false;
            lastSpawnTime = performance.now();
            lastCollisionCheck = performance.now();
            lastFrameTime = performance.now();
            lastSessionSave = performance.now();
            cachedCharacterRect = null;
            updateGameAreaRect();
            updateCoinSpeed();
            requestAnimationFrame(gameLoop);
            bgMusic.play().catch(error => {
                console.error('Background music failed to play:', error, error.stack);
            });
        } else {
            startScreen.classList.add('show');
        }
        console.log('Hiding leaderboard screen');
    } catch (error) {
        console.error('Failed to hide leaderboard screen:', error, error.stack);
        showError('无法隐藏排行榜，请刷新页面重试。');
    }
}

function startGame() {
    try {
        clearSession();
        console.log('Starting game, showing name input screen...');
        showNameInputScreen();
        try {
            logEvent(analytics, 'game_start', { mode: 'new' });
        } catch (error) {
            console.error('Analytics game_start event failed:', error);
        }
    } catch (error) {
        console.error('Failed to start game:', error, error.stack);
        showError('无法启动游戏，请刷新页面重试。');
    }
}

function resumeGame() {
    try {
        if (loadSession()) {
            startScreen.classList.remove('show');
            isGameOver = false;
            characterSelection.style.display = 'none';
            nameInputScreen.classList.remove('show');
            gameArea.style.display = 'block';
            controls.style.display = 'flex';
            restartContainer.style.display = 'flex';
            addressContainer.style.display = 'flex';
            lastSpawnTime = performance.now();
            lastCollisionCheck = performance.now();
            lastFrameTime = performance.now();
            lastSessionSave = performance.now();
            cachedCharacterRect = null;
            updateGameAreaRect();
            updateCoinSpeed();
            requestAnimationFrame(gameLoop);
            bgMusic.play().catch(error => {
                console.error('背景音乐播放失败:', error, error.stack);
            });
            console.log('Game resumed');
            try {
                logEvent(analytics, 'game_start', { mode: 'resume' });
            } catch (error) {
                console.error('Analytics game_start event failed:', error);
            }
        } else {
            console.log('No valid session to resume, starting new game');
            showNameInputScreen();
        }
    } catch (error) {
        console.error('Failed to resume game:', error, error.stack);
        showError('无法恢复游戏，请刷新页面重试。');
    }
}

startButton.addEventListener('click', startGame);
if (resumeButton) {
    resumeButton.addEventListener('click', resumeGame);
}
if (leaderboardButton) {
    leaderboardButton.addEventListener('click', () => showLeaderboardScreen(false));
}
if (gameLeaderboardButton) {
    gameLeaderboardButton.addEventListener('click', () => showLeaderboardScreen(true));
}
if (leaderboardBackButton) {
    leaderboardBackButton.addEventListener('click', hideLeaderboardScreen);
}
if (nameSubmitButton) {
    nameSubmitButton.addEventListener('click', () => {
        const input = nameInput.value.trim();
        const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
        if (input === '') {
            alert('请输入名称或有效的以太坊地址');
            return;
        }
        if (ethAddressRegex.test(input)) {
            playerNameOrAddress = truncateAddress(input);
            playerFullAddress = input;
        } else {
            playerNameOrAddress = input;
            playerFullAddress = null;
        }
        try {
            setUserProperties(analytics, {
                player_name: playerNameOrAddress.substring(0, 20),
                is_eth_address: !!playerFullAddress
            });
        } catch (error) {
            console.error('Analytics setUserProperties failed:', error);
        }
        showCharacterSelection();
    });
    nameInput.addEventListener('keydown', (e) => {
        if (e.code === 'Enter') {
            nameSubmitButton.click();
        }
    });
}

document.querySelectorAll('.select-character-button').forEach(button => {
    button.addEventListener('click', () => {
        try {
            selectedCharacterImage = button.dataset.character;
            character.style.backgroundImage = `url("${selectedCharacterImage}")`;
            characterSelection.style.display = 'none';
            gameArea.style.display = 'block';
            controls.style.display = 'flex';
            restartContainer.style.display = 'flex';
            addressContainer.style.display = 'flex';
            bgMusic.play().catch(error => {
                console.error('背景音乐播放失败:', error, error.stack);
            });
            restartGame();
            console.log('Character selected, game started');
            try {
                logEvent(analytics, 'select_character', {
                    character: selectedCharacterImage.split('/').pop()
                });
            } catch (error) {
                console.error('Analytics select_character event failed:', error);
            }
        } catch (error) {
            console.error('Failed to select character:', error, error.stack);
            showError('角色选择失败，请刷新页面重试。');
        }
    });
});

function updateCharacterPosition() {
    if (!isGameOver && moveDirection !== 0) {
        characterX = Math.max(9, Math.min(91, characterX + moveDirection * currentConfig.moveSpeed));
        character.style.left = `${characterX}%`;
        isFacingRight = moveDirection > 0;
        character.style.transform = `translateX(-50%) scaleX(${isFacingRight ? 1 : -1}) translateZ(0)`;
        cachedCharacterRect = null;
    }
}

document.addEventListener('keydown', (e) => {
    if (isGameOver) return;
    if (e.code === 'ArrowLeft') {
        e.preventDefault();
        moveDirection = -1;
    } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        moveDirection = 1;
    }
});

document.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft' && moveDirection === -1) {
        moveDirection = 0;
    } else if (e.code === 'ArrowRight' && moveDirection === 1) {
        moveDirection = 0;
    }
});

leftButton.addEventListener('mousedown', (e) => {
    e.preventDefault();
    if (!isGameOver) moveDirection = -1;
});
leftButton.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (!isGameOver) moveDirection = -1;
});
leftButton.addEventListener('mouseup', () => {
    moveDirection = 0;
});
leftButton.addEventListener('touchend', (e) => {
    e.preventDefault();
    moveDirection = 0;
});
leftButton.addEventListener('mouseleave', () => {
    moveDirection = 0;
});

rightButton.addEventListener('mousedown', (e) => {
    e.preventDefault();
    if (!isGameOver) moveDirection = 1;
});
rightButton.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (!isGameOver) moveDirection = 1;
});
rightButton.addEventListener('mouseup', () => {
    moveDirection = 0;
});
rightButton.addEventListener('touchend', (e) => {
    e.preventDefault();
    moveDirection = 0;
});
rightButton.addEventListener('mouseleave', () => {
    moveDirection = 0;
});

restartButton.addEventListener('click', () => {
    clearSession();
    restartGame();
});

gameOverDisplay.addEventListener('click', (e) => {
    if (e.target.id !== 'game-over-restart') return;
    clearSession();
    restartGame();
});

gameOverDisplay.addEventListener('keydown', (e) => {
    if (e.code === 'Enter') {
        clearSession();
        restartGame();
    }
});

function showError(message) {
    try {
        gameOverDisplay.innerHTML = `
            <div>错误！</div>
            <div>${message}</div>
            <button id="game-over-restart" aria-label="重新开始游戏">重新开始</button>
        `;
        gameOverDisplay.style.display = 'flex';
        gameOverOverlay.style.display = 'block';
        isGameOver = true;
        bgMusic.pause();
        saveSession();
    } catch (error) {
        console.error('Failed to show error:', error, error.stack);
    }
}

function restartGame() {
    try {
        isGameOver = false;
        score = 0;
        life = currentConfig.maxLife;
        level = 1;
        spawnInterval = currentConfig.initialSpawnInterval;
        characterX = 50;
        isFacingRight = true;
        moveDirection = 0;
        character.style.left = `${characterX}%`;
        character.style.transform = `translateX(-50%) scaleX(1) translateZ(0)`;
        character.style.backgroundImage = `url("${selectedCharacterImage}")`;
        if (scoreDisplay) scoreDisplay.textContent = `得分: ${score} | 最高分: -`;
        if (lifeDisplay) lifeDisplay.textContent = `生命: ${life}`;
        if (levelDisplay) levelDisplay.textContent = `等级: ${level}`;
        gameOverDisplay.style.display = 'none';
        gameOverOverlay.style.display = 'none';
        addressContainer.style.display = 'flex';
        gameOverDisplay.innerHTML = `
            <div>游戏结束！</div>
            <div id="game-over-level">等级: ${level}</div>
            <div id="game-over-score">得分: ${score}</div>
            <div id="game-over-high-score">最高分: -</div>
            <div id="game-over-life">生命: ${life}</div>
            <div>再试一次，挑战更高分数！</div>
            <button id="game-over-restart" aria-label="重新开始游戏">重新开始</button>
        `;
        coins.forEach(coin => {
            if (coin.parentNode) {
                coin.cleanup();
                coin.remove();
            }
        });
        coins.length = 0;
        coinCount = 0;
        cachedCharacterRect = null;
        // Ensure gameAreaRect is initialized before spawning coins
        updateGameAreaRect();
        const initialCoinCount = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < initialCoinCount; i++) {
            spawnCoin();
        }
        lastSpawnTime = performance.now();
        lastCollisionCheck = performance.now();
        lastFrameTime = performance.now();
        lastSessionSave = performance.now();
        updateCoinSpeed();
        startScreen.classList.remove('show');
        nameInputScreen.classList.remove('show');
        characterSelection.style.display = 'none';
        gameArea.style.display = 'block';
        controls.style.display = 'flex';
        restartContainer.style.display = 'flex';
        requestAnimationFrame(gameLoop);
        bgMusic.play().catch(error => {
            console.error('背景音乐播放失败:', error, error.stack);
        });
    } catch (error) {
        console.error('Failed to restart game:', error, error.stack);
        showError('无法重启游戏，请刷新页面重试。');
    }
}

function getExplosion() {
    try {
        let explosion = explosionPool.find(e => !e.parentNode);
        if (!explosion) {
            if (explosionPool.length >= maxExplosionPoolSize) {
                explosion = explosionPool.shift();
                if (explosion.parentNode) explosion.remove();
            }
            explosion = document.createElement('div');
            explosion.classList.add('explosion');
            explosionPool.push(explosion);
        }
        explosion.addEventListener('animationend', () => {
            if (explosion.parentNode) {
                explosion.remove();
            }
        });
        return explosion;
    } catch (error) {
        console.error('Failed to create explosion:', error, error.stack);
        return null;
    }
}

function updateCoinSpeed() {
    try {
        const fallDuration = Math.max(
            currentConfig.minFallDuration,
            currentConfig.initialFallDuration - (level - 1) * currentConfig.fallDurationDecrease
        );
        coins.forEach(coin => {
            coin.style.setProperty('--fall-duration', `${fallDuration}s`);
        });
    } catch (error) {
        console.error('Failed to update coin speed:', error, error.stack);
    }
}

function spawnCoin() {
    try {
        if (coinCount >= currentConfig.maxCoins(level) || isGameOver) return;
        // Ensure gameAreaRect is initialized
        if (!gameAreaRect) {
            updateGameAreaRect();
            if (!gameAreaRect) {
                console.warn('gameAreaRect still null, skipping coin spawn');
                return;
            }
        }
        const coin = document.createElement('div');
        coin.classList.add('coin');
        const maxX = gameArea.offsetWidth - 70;
        let randomX;
        let isValidPosition;
        do {
            randomX = Math.random() * maxX;
            isValidPosition = true;
            coins.forEach(existingCoin => {
                if (existingCoin.parentNode) { // Only check coins in DOM
                    const existingRect = existingCoin.getBoundingClientRect();
                    if (Math.abs(randomX - (existingRect.left - gameAreaRect.left)) < 80) {
                        isValidPosition = false;
                    }
                }
            });
        } while (!isValidPosition);
        coin.style.left = `${randomX}px`;
        coin.style.top = '-70px';
        const fallDuration = Math.max(
            currentConfig.minFallDuration,
            currentConfig.initialFallDuration - (level - 1) * currentConfig.fallDurationDecrease
        );
        coin.style.setProperty('--fall-duration', `${fallDuration}s`);
        gameArea.appendChild(coin);
        coins.push(coin);
        coinCount++;

        coin.onerror = () => {
            coin.style.backgroundImage = `url("${fallbackCoinImage}")`;
            console.warn('Coin image failed to load, using fallback.');
        };

        const handleAnimationEnd = (e) => {
            if (e.animationName === 'fall' && coin.parentNode) {
                coin.cleanup();
                coin.remove();
                coins.splice(coins.indexOf(coin), 1);
                coinCount--;
                life--;
                if (lifeDisplay) lifeDisplay.textContent = `生命: ${life}`;
                if (life <= 0) gameOver();
            }
        };

        const handleClick = (e) => {
            e.stopPropagation();
            if (!isGameOver) collectCoin(coin);
        };

        coin.addEventListener('animationend', handleAnimationEnd);
        coin.addEventListener('click', handleClick);
        coin.cleanup = () => {
            try {
                coin.removeEventListener('animationend', handleAnimationEnd);
                coin.removeEventListener('click', handleClick);
                coin.onerror = null;
                coin.style.animation = 'none';
            } catch (error) {
                console.error('Failed to clean up coin:', error, error.stack);
            }
        };
    } catch (error) {
        console.error('Failed to spawn coin:', error, error.stack);
    }
}

function collectCoin(coin) {
    try {
        score += 10;
        const newLevel = Math.floor(score / 100) + 1;
        if (newLevel > level) {
            level = newLevel;
            if (levelDisplay) levelDisplay.textContent = `等级: ${level}`;
            updateCoinSpeed();
            try {
                logEvent(analytics, 'level_up', { level: newLevel });
            } catch (error) {
                console.error('Analytics level_up event failed:', error);
            }
        }
        if (scoreDisplay) scoreDisplay.textContent = `得分: ${score} | 最高分: -`;
        spawnInterval = Math.max(currentConfig.minSpawnInterval, spawnInterval - currentConfig.spawnIntervalDecrease);

        const rect = coin.getBoundingClientRect();
        const explosion = getExplosion();
        if (explosion) {
            explosion.style.left = `${rect.left - gameAreaRect.left + rect.width / 2 - 40}px`;
            explosion.style.top = `${rect.top - gameAreaRect.top + rect.height / 2 - 40}px`;
            gameArea.appendChild(explosion);
        }

        if (!isMobile) {
            character.classList.add('glow');
            setTimeout(() => {
                if (explosion && explosion.parentNode) explosion.remove();
                character.classList.remove('glow');
            }, 500);
        } else {
            setTimeout(() => {
                if (explosion && explosion.parentNode) explosion.remove();
            }, 500);
        }

        if (coin.parentNode) {
            coin.cleanup();
            coin.remove();
            coins.splice(coins.indexOf(coin), 1);
            coinCount--;
        }
        try {
            logEvent(analytics, 'collect_coin', {
                score_increase: 10,
                level: level,
                character: selectedCharacterImage.split('/').pop()
            });
        } catch (error) {
            console.error('Analytics collect_coin event failed:', error);
        }
        saveSession();
    } catch (error) {
        console.error('Failed to collect coin:', error, error.stack);
    }
}

function checkCollisions() {
    if (isGameOver) return;
    try {
        if (!cachedCharacterRect) {
            const characterRect = character.getBoundingClientRect();
            const hitboxPaddingX = characterRect.width * 0.1;
            const hitboxPaddingY = characterRect.height * 0.1;
            cachedCharacterRect = {
                left: characterRect.left + hitboxPaddingX,
                right: characterRect.right - hitboxPaddingX,
                top: characterRect.top + hitboxPaddingY,
                bottom: characterRect.bottom - hitboxPaddingY,
            };
        }
        const coinsToRemove = [];
        coins.forEach((coin) => {
            if (!coin.parentNode) return;
            const coinRect = coin.getBoundingClientRect();
            if (
                cachedCharacterRect.left < coinRect.right &&
                cachedCharacterRect.right > coinRect.left &&
                cachedCharacterRect.top < coinRect.bottom &&
                cachedCharacterRect.bottom > coinRect.top
            ) {
                coinsToRemove.push(coin);
            }
        });
        coinsToRemove.forEach(coin => collectCoin(coin));
    } catch (error) {
        console.error('Failed to check collisions:', error, error.stack);
    }
}

function gameOver() {
    try {
        isGameOver = true;
        saveHighScore(score, playerNameOrAddress, playerFullAddress);
        gameOverDisplay.innerHTML = `
            <div>游戏结束！</div>
            <div id="game-over-level">等级: ${level}</div>
            <div id="game-over-score">得分: ${score}</div>
            <div id="game-over-high-score">最高分: -</div>
            <div id="game-over-life">生命: ${life}</div>
            <div>再试一次，挑战更高分数！</div>
            <button id="game-over-restart" aria-label="重新开始游戏">重新开始</button>
        `;
        gameOverDisplay.style.display = 'flex';
        gameOverOverlay.style.display = 'block';
        addressContainer.style.display = 'flex';
        coins.forEach(coin => {
            if (coin.parentNode) {
                coin.cleanup();
                coin.remove();
            }
        });
        coins.length = 0;
        coinCount = 0;
        bgMusic.pause();
        try {
            logEvent(analytics, 'game_over', {
                final_score: score,
                level_reached: level,
                lives_remaining: life,
                reason: life <= 0 ? 'out_of_lives' : 'quit'
            });
        } catch (error) {
            console.error('Analytics game_over event failed:', error);
        }
        saveSession();
    } catch (error) {
        console.error('Failed to end game:', error, error.stack);
        showError('游戏结束失败，请刷新页面重试。');
    }
}

function gameLoop(timestamp) {
    if (!isGameOver && timestamp - lastFrameTime >= 16) {
        try {
            const start = performance.now();
            updateCharacterPosition();
            if (!gameAreaRect) updateGameAreaRect();
            if (timestamp - lastCollisionCheck >= collisionCheckInterval) {
                checkCollisions();
                lastCollisionCheck = timestamp;
            }
            if (timestamp - lastSpawnTime >= spawnInterval && coinCount < currentConfig.maxCoins(level)) {
                spawnCoin();
                lastSpawnTime = timestamp;
            }
            if (timestamp - lastSessionSave >= sessionSaveInterval) {
                saveSession();
                lastSessionSave = timestamp;
            }
            lastFrameTime = timestamp;
            const duration = performance.now() - start;
            if (duration > 16) {
                console.warn(`Slow frame: ${duration.toFixed(2)}ms, coins: ${coinCount}, level: ${level}`);
                if (duration > 50) {
                    console.warn('Pausing coin spawn due to slow frame');
                    lastSpawnTime += 500;
                }
            }
        } catch (error) {
            console.error('Game loop error:', error, error.stack);
            showError('游戏循环错误，请刷新页面重试。');
        }
    }
    if (!isGameOver) requestAnimationFrame(gameLoop);
}

function updateGameAreaRect() {
    try {
        gameAreaRect = gameArea.getBoundingClientRect();
    } catch (error) {
        console.error('Failed to update game area rect:', error, error.stack);
    }
}

let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(updateGameAreaRect, 100);
});

character.onerror = () => {
    character.style.backgroundImage = `url("${fallbackCharacterImage}")`;
    console.warn('Character image failed to load, using fallback.');
};

document.addEventListener('visibilitychange', () => {
    try {
        if (document.hidden) {
            isGameOver = true;
            bgMusic.pause();
            saveSession();
        } else if (!gameOverDisplay.style.display && gameArea.style.display === 'block') {
            isGameOver = false;
            lastSpawnTime = performance.now();
            lastCollisionCheck = performance.now();
            lastFrameTime = performance.now();
            lastSessionSave = performance.now();
            cachedCharacterRect = null;
            updateGameAreaRect();
            updateCoinSpeed();
            addressContainer.style.display = 'flex';
            requestAnimationFrame(gameLoop);
            bgMusic.play().catch(error => {
                console.error('Background music failed to play:', error, error.stack);
            });
        }
    } catch (error) {
        console.error('Failed to handle visibility change:', error, error.stack);
        showError('页面可见性切换失败，请刷新页面重试。');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM content loaded');
    try {
        scoreDisplay.textContent = `得分: ${score} | 最高分: -`;
        lifeDisplay.textContent = `生命: ${life}`;
        levelDisplay.textContent = `等级: ${level}`;
        addressContainer.style.display = 'none';
        startScreen.classList.add('show');
        nameInputScreen.classList.remove('show');
        characterSelection.style.display = 'none';
        leaderboardScreen.classList.remove('show');
        // Initialize gameAreaRect on load to prevent null issues
        updateGameAreaRect();
        console.log('Initial game state set');
    } catch (error) {
        console.error('Failed to initialize game state:', error, error.stack);
        showError('游戏初始化失败，请检查页面元素并刷新重试。');
    }
});
