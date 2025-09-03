const startScreen = document.getElementById('start-screen');
const startButton = document.getElementById('start-button');
const gameArea = document.getElementById('game-area');
const controls = document.getElementById('controls');
const restartContainer = document.getElementById('restart-container');
const character = document.getElementById('character');
const scoreDisplay = document.getElementById('score');
const lifeDisplay = document.getElementById('life');
const levelDisplay = document.getElementById('level');
const gameOverDisplay = document.getElementById('game-over');
const leftButton = document.getElementById('left-button');
const jumpButton = document.getElementById('jump-button');
const rightButton = document.getElementById('right-button');
const restartButton = document.getElementById('restart-button');
const bgMusic = document.getElementById('bg-music');

const isMobile = /Mobi|Android/i.test(navigator.userAgent);
const gameConfig = {
    medium: {
        maxLife: 5,
        initialSpawnInterval: 2000,
        spawnIntervalDecrease: 25,
        minSpawnInterval: 500,
        moveSpeed: 5,
        jumpHeight: '-150px',
        initialFallDuration: 6,
        fallDurationDecrease: 0.3,
        minFallDuration: 2,
        maxCoins: (level) => isMobile ? Math.min(8, Math.floor(level / 2) + 3) : Math.min(15, Math.floor(level / 2) + 5),
    },
};

let currentConfig = gameConfig.medium;
let score = 0;
let highScore = localStorage.getItem('highScore') || 0;
let life = currentConfig.maxLife;
let level = 1;
let isJumping = false;
let coinCount = 0;
let spawnInterval = currentConfig.initialSpawnInterval;
let isGameOver = false;
let lastSpawnTime = 0;
let characterX = 50;
let isFacingRight = true;
let moveDirection = 0;
let lastCollisionCheck = 0;
let lastFrameTime = 0;
const collisionCheckInterval = 200;
const coins = [];
const explosionPool = [];
const maxExplosionPoolSize = 10;
let gameAreaRect = null;

// Fallback base64 images (replace with actual base64 strings)
const fallbackCharacterImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGURgAAAABJRU5ErkJggg==';
const fallbackCoinImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHogJ/PdX9BAAAAABJRU5ErkJggg==';

// Preload images and audio
const preloadImages = [
    'https://i.ibb.co/GKJ0mzX/IMG-5096.jpg',
    'https://i.ibb.co/PZbrMCsh/IMG-5097.png',
    'https://i.ibb.co/2mpzr9Y/IMG-5090.png',
    'https://i.ibb.co/LhvzWrfc/IMG-5089.webp',
];
preloadImages.forEach(src => {
    const img = new Image();
    img.src = src;
    img.onerror = () => console.warn(`Failed to preload image: ${src}`);
});
bgMusic.load();
bgMusic.volume = 0.3;

function updateGameAreaRect() {
    try {
        gameAreaRect = gameArea.getBoundingClientRect();
    } catch (error) {
        console.error('Failed to update game area rect:', error);
    }
}
window.addEventListener('resize', updateGameAreaRect);
updateGameAreaRect();

function startGame() {
    try {
        startScreen.style.display = 'none';
        gameArea.style.display = 'block';
        controls.style.display = 'flex';
        restartContainer.style.display = 'flex';
        bgMusic.play().catch(error => {
            console.error('背景音乐播放失败:', error);
        });
        restartGame();
    } catch (error) {
        console.error('Failed to start game:', error);
        showError('无法启动游戏，请刷新页面重试。');
    }
}

startButton.addEventListener('click', startGame);

function jump() {
    if (!isJumping && !isGameOver) {
        isJumping = true;
        character.style.transform = `translateX(-50%) translateY(${currentConfig.jumpHeight}) scaleX(${isFacingRight ? 1 : -1}) translateZ(0)`;
        setTimeout(() => {
            character.style.transform = `translateX(-50%) translateY(0) scaleX(${isFacingRight ? 1 : -1}) translateZ(0)`;
            isJumping = false;
        }, 300);
    }
}

function updateCharacterPosition() {
    if (!isGameOver && moveDirection !== 0) {
        characterX = Math.max(9, Math.min(91, characterX + moveDirection * currentConfig.moveSpeed));
        character.style.left = `${characterX}%`;
        isFacingRight = moveDirection > 0;
        character.style.transform = `translateX(-50%) scaleX(${isFacingRight ? 1 : -1})${isJumping ? ` translateY(${currentConfig.jumpHeight})` : ''} translateZ(0)`;
    }
}

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        jump();
    } else if (e.code === 'ArrowLeft') {
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

jumpButton.addEventListener('click', (e) => {
    e.preventDefault();
    jump();
});

let touchStartX = 0;
let lastTouchMove = 0;
let hasSwiped = false;
const touchMoveThrottle = 100;
gameArea.addEventListener('touchstart', (e) => {
    e.preventDefault();
    touchStartX = e.touches[0].clientX;
    hasSwiped = false;
});

gameArea.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches.length > 1) return;
    if (performance.now() - lastTouchMove < touchMoveThrottle) return;
    lastTouchMove = performance.now();
    let touchEndX = e.touches[0].clientX;
    const swipeThreshold = 50 / window.devicePixelRatio;
    if (Math.abs(touchEndX - touchStartX) > swipeThreshold) {
        hasSwiped = true;
        moveDirection = touchEndX > touchStartX ? 1 : -1;
    }
});

gameArea.addEventListener('touchend', (e) => {
    e.preventDefault();
    moveDirection = 0;
    if (!hasSwiped) jump();
    hasSwiped = false;
});

character.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isMobile) jump();
});

restartButton.addEventListener('click', () => {
    restartGame();
});

gameOverDisplay.addEventListener('click', () => {
    restartGame();
});

gameOverDisplay.addEventListener('keydown', (e) => {
    if (e.code === 'Enter') {
        restartGame();
    }
});

function showError(message) {
    gameOverDisplay.innerHTML = `
        <div>错误！</div>
        <div>${message}</div>
        <div>点击或按 Enter 重新开始</div>
    `;
    gameOverDisplay.style.display = 'flex';
    isGameOver = true;
    bgMusic.pause();
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
        scoreDisplay.textContent = `得分: ${score} | 最高分: ${highScore}`;
        lifeDisplay.textContent = `生命: ${life}`;
        if (levelDisplay) levelDisplay.textContent = `等级: ${level}`;
        gameOverDisplay.style.display = 'none';
        gameOverDisplay.innerHTML = `
            <div>游戏结束！</div>
            <div>等级: ${level}</div>
            <div>得分: ${score}</div>
            <div>最高分: ${highScore}</div>
            <div>生命: ${life}</div>
            <div>点击或按 Enter 重新开始</div>
        `;
        updateGameAreaBackground();
        coins.forEach(coin => {
            if (coin.parentNode) {
                coin.cleanup();
                coin.remove();
            }
        });
        coins.length = 0;
        coinCount = 0;
        const initialCoinCount = Math.floor(Math.random() * 5) + 1;
        for (let i = 0; i < initialCoinCount; i++) {
            spawnCoin();
        }
        lastSpawnTime = performance.now();
        lastCollisionCheck = performance.now();
        lastFrameTime = performance.now();
        updateCoinSpeed();
        updateGameAreaRect();
        requestAnimationFrame(gameLoop);
        bgMusic.play().catch(error => {
            console.error('背景音乐播放失败:', error);
        });
    } catch (error) {
        console.error('Failed to restart game:', error);
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
        return explosion;
    } catch (error) {
        console.error('Failed to create explosion:', error);
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
        console.error('Failed to update coin speed:', error);
    }
}

function spawnCoin() {
    try {
        if (coinCount >= currentConfig.maxCoins(level) || isGameOver) return;
        const coin = document.createElement('div');
        coin.classList.add('coin');
        const maxX = gameArea.offsetWidth - 70;
        let randomX;
        let isValidPosition;
        do {
            randomX = Math.random() * maxX;
            isValidPosition = true;
            coins.forEach(existingCoin => {
                const existingRect = existingCoin.getBoundingClientRect();
                if (Math.abs(randomX - (existingRect.left - gameAreaRect.left)) < 80) {
                    isValidPosition = false;
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
                lifeDisplay.textContent = `生命: ${life}`;
                updateGameAreaBackground();
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
            coin.removeEventListener('animationend', handleAnimationEnd);
            coin.removeEventListener('click', handleClick);
            coin.onerror = null;
        };
    } catch (error) {
        console.error('Failed to spawn coin:', error);
    }
}

let lastBackgroundUpdateLife = life;
function updateGameAreaBackground() {
    try {
        if (lastBackgroundUpdateLife === life) return;
        lastBackgroundUpdateLife = life;
        const redIntensity = (currentConfig.maxLife - life) / currentConfig.maxLife;
        gameArea.style.background = `linear-gradient(to bottom, rgba(255, 102, 102, ${redIntensity * 0.7}), rgba(255, 255, 255, 0.1)), url("https://i.ibb.co/PZbrMCsh/IMG-5097.png") no-repeat center center`;
        gameArea.style.backgroundSize = 'cover';
    } catch (error) {
        console.error('Failed to update game area background:', error);
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
        }
        highScore = Math.max(highScore, score);
        localStorage.setItem('highScore', highScore);
        scoreDisplay.textContent = `得分: ${score} | 最高分: ${highScore}`;
        spawnInterval = Math.max(currentConfig.minSpawnInterval, spawnInterval - currentConfig.spawnIntervalDecrease);

        const rect = coin.getBoundingClientRect();
        const explosion = getExplosion();
        if (explosion) {
            explosion.style.left = `${rect.left - gameAreaRect.left + rect.width / 2 - 40}px`;
            explosion.style.top = `${rect.top - gameAreaRect.top + rect.height / 2 - 40}px`;
            gameArea.appendChild(explosion);
        }

        character.classList.add('glow');
        setTimeout(() => {
            if (explosion && explosion.parentNode) explosion.remove();
            character.classList.remove('glow');
        }, 600);

        if (coin.parentNode) {
            coin.cleanup();
            coin.remove();
            coins.splice(coins.indexOf(coin), 1);
            coinCount--;
        }
    } catch (error) {
        console.error('Failed to collect coin:', error);
    }
}

function checkCollisions() {
    if (isGameOver) return;
    try {
        const characterRect = character.getBoundingClientRect();
        const hitboxPaddingX = characterRect.width * 0.1;
        const hitboxPaddingY = characterRect.height * 0.1;
        const adjustedCharacterRect = {
            left: characterRect.left + hitboxPaddingX,
            right: characterRect.right - hitboxPaddingX,
            top: characterRect.top + hitboxPaddingY,
            bottom: characterRect.bottom - hitboxPaddingY,
        };
        const coinsToRemove = [];
        coins.forEach((coin) => {
            if (!coin.parentNode) return;
            const coinRect = coin.getBoundingClientRect();
            if (
                adjustedCharacterRect.left < coinRect.right &&
                adjustedCharacterRect.right > coinRect.left &&
                adjustedCharacterRect.top < coinRect.bottom &&
                adjustedCharacterRect.bottom > coinRect.top
            ) {
                coinsToRemove.push(coin);
            }
        });
        coinsToRemove.forEach(coin => collectCoin(coin));
    } catch (error) {
        console.error('Failed to check collisions:', error);
    }
}

function gameOver() {
    try {
        isGameOver = true;
        gameOverDisplay.innerHTML = `
            <div>游戏结束！</div>
            <div>等级: ${level}</div>
            <div>得分: ${score}</div>
            <div>最高分: ${highScore}</div>
            <div>生命: ${life}</div>
            <div>点击或按 Enter 重新开始</div>
        `;
        gameOverDisplay.style.display = 'flex';
        coins.forEach(coin => {
            if (coin.parentNode) {
                coin.cleanup();
                coin.remove();
            }
        });
        coins.length = 0;
        coinCount = 0;
        bgMusic.pause();
    } catch (error) {
        console.error('Failed to end game:', error);
        showError('游戏结束失败，请刷新页面重试。');
    }
}

function gameLoop(timestamp) {
    if (!isGameOver && timestamp - lastFrameTime >= 16) {
        try {
            const start = performance.now();
            updateCharacterPosition();
            if (timestamp - lastCollisionCheck >= collisionCheckInterval) {
                checkCollisions();
                lastCollisionCheck = timestamp;
            }
            if (timestamp - lastSpawnTime >= spawnInterval && coinCount < currentConfig.maxCoins(level)) {
                spawnCoin();
                lastSpawnTime = timestamp;
            }
            lastFrameTime = timestamp;
            const duration = performance.now() - start;
            if (duration > 16) console.warn(`Slow frame: ${duration.toFixed(2)}ms`);
        } catch (error) {
            console.error('游戏循环错误:', error);
            showError('游戏循环错误，请刷新页面重试。');
        }
    }
    if (!isGameOver) requestAnimationFrame(gameLoop);
}

character.onerror = () => {
    character.style.backgroundImage = `url("${fallbackCharacterImage}")`;
    console.warn('Character image failed to load, using fallback.');
};

document.addEventListener('visibilitychange', () => {
    try {
        if (document.hidden) {
            isGameOver = true;
            bgMusic.pause();
        } else if (!gameOverDisplay.style.display && gameArea.style.display === 'block') {
            isGameOver = false;
            lastSpawnTime = performance.now();
            lastCollisionCheck = performance.now();
            lastFrameTime = performance.now();
            updateGameAreaRect();
            updateCoinSpeed();
            requestAnimationFrame(gameLoop);
            bgMusic.play().catch(error => {
                console.error('背景音乐播放失败:', error);
            });
        }
    } catch (error) {
        console.error('Failed to handle visibility change:', error);
    }
});

// Initialize game state
try {
    scoreDisplay.textContent = `得分: ${score} | 最高分: ${highScore}`;
    lifeDisplay.textContent = `生命: ${life}`;
    if (levelDisplay) {
        levelDisplay.textContent = `等级: ${level}`;
    } else {
        console.error('levelDisplay is null; check if #level element exists in the DOM');
    }
} catch (error) {
    console.error('Failed to initialize game state:', error);
    showError('游戏初始化失败，请刷新页面重试。');
}