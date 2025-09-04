console.log('game.js loaded');

const startScreen = document.getElementById('start-screen');
const startButton = document.getElementById('start-button');
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
const jumpButton = document.getElementById('jump-button');
const rightButton = document.getElementById('right-button');
const restartButton = document.getElementById('restart-button');
const bgMusic = document.getElementById('bg-music');
const addressContainer = document.getElementById('address-container');
const addressText = document.getElementById('address-text');
const copyButton = document.getElementById('copy-button');

// Validate critical DOM elements
const missingElements = [];
if (!startScreen) missingElements.push('start-screen');
if (!startButton) missingElements.push('start-button');
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
    document.body.innerHTML = `<div style="color: red; text-align: center; padding: 20px;">错误：无法找到必要的页面元素 (${missingElements.join(', ')})。请检查HTML结构并刷新页面。</div>`;
    throw new Error(`Missing DOM elements: ${missingElements.join(', ')}`);
}

// Add copy button functionality
copyButton.addEventListener('click', () => {
    try {
        const fullAddress = addressText.dataset.fullAddress || addressText.textContent;
        navigator.clipboard.writeText(fullAddress).then(() => {
            copyButton.textContent = '已复制!';
            copyButton.style.backgroundColor = 'rgba(50, 205, 50, 0.9)';
            const toast = document.getElementById('copy-toast');
            if (toast) {
                toast.classList.add('show');
                setTimeout(() => {
                    toast.classList.remove('show');
                }, 2000);
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
        maxCoins: (level) => isMobile ? Math.min(3, Math.floor(level / 2) + 2) : Math.min(6, Math.floor(level / 2) + 4),
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
let lastTurnTime = 0; // For turning cooldown
const turnCooldown = 300; // 500ms cooldown for turning
const collisionCheckInterval = 250;
const coins = [];
const explosionPool = [];
const maxExplosionPoolSize = 10;
let gameAreaRect = null;
let cachedCharacterRect = null;
let lastBackgroundUpdateLife = life;
let selectedCharacterImage = 'https://raw.githubusercontent.com/annashen0805-art/zhongkui/main/characters.png';

// Fallback base64 images
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
updateGameAreaRect();

function showCharacterSelection() {
    try {
        startScreen.style.display = 'none';
        characterSelection.style.display = 'block';
        console.log('Showing character selection screen');
    } catch (error) {
        console.error('Failed to show character selection:', error, error.stack);
        showError('无法显示角色选择界面，请刷新页面重试。');
    }
}

function startGame() {
    try {
        console.log('Starting game, showing character selection...');
        showCharacterSelection();
    } catch (error) {
        console.error('Failed to start game:', error, error.stack);
        showError('无法启动游戏，请刷新页面重试。');
    }
}

startButton.addEventListener('click', startGame);

// Handle character selection
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
        } catch (error) {
            console.error('Failed to select character:', error, error.stack);
            showError('角色选择失败，请刷新页面重试。');
        }
    });
});

function jump() {
    if (!isJumping && !isGameOver) {
        isJumping = true;
        cachedCharacterRect = null;
        character.classList.add('jumping');
        character.style.transform = `translateX(-50%) rotateY(${isFacingRight ? 0 : 180}deg) translateY(${currentConfig.jumpHeight}) translateZ(0)`;
        setTimeout(() => {
            character.style.transform = `translateX(-50%) rotateY(${isFacingRight ? 0 : 180}deg) translateY(0) translateZ(0)`;
            character.classList.remove('jumping');
            isJumping = false;
            cachedCharacterRect = null;
        }, 300);
    }
}

function updateCharacterPosition() {
    if (!isGameOver && moveDirection !== 0) {
        characterX = Math.max(9, Math.min(91, characterX + moveDirection * currentConfig.moveSpeed));
        character.style.left = `${characterX}%`;

        const currentTime = performance.now();
        // Handle direction change with cooldown
        if (moveDirection > 0 && !isFacingRight && currentTime - lastTurnTime >= turnCooldown) {
            // Turning right
            character.style.animation = 'turnRight 0.3s ease forwards';
            isFacingRight = true;
            lastTurnTime = currentTime;
            setTimeout(() => {
                character.style.animation = 'none';
                character.style.transform = `translateX(-50%) rotateY(0deg) translateZ(0)${isJumping ? ` translateY(${currentConfig.jumpHeight})` : ''}`;
            }, 300);
        } else if (moveDirection < 0 && isFacingRight && currentTime - lastTurnTime >= turnCooldown) {
            // Turning left
            character.style.animation = 'turnLeft 0.3s ease forwards';
            isFacingRight = false;
            lastTurnTime = currentTime;
            setTimeout(() => {
                character.style.animation = 'none';
                character.style.transform = `translateX(-50%) rotateY(180deg) translateZ(0)${isJumping ? ` translateY(${currentConfig.jumpHeight})` : ''}`;
            }, 300);
        } else {
            // Maintain current direction
            character.style.transform = `translateX(-50%) rotateY(${isFacingRight ? 0 : 180}deg) translateZ(0)${isJumping ? ` translateY(${currentConfig.jumpHeight})` : ''}`;
        }

        cachedCharacterRect = null;
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
    if (!isGameOver) e.preventDefault();
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
    if (!isGameOver) e.preventDefault();
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
    console.log('Touchstart detected at:', performance.now());
    if (!isGameOver) e.preventDefault();
    touchStartX = e.touches[0].clientX;
    hasSwiped = false;
}, { passive: false });

gameArea.addEventListener('touchmove', (e) => {
    if (!isGameOver) e.preventDefault();
    if (e.touches.length > 1) {
        console.log('Multi-touch detected, ignoring');
        return;
    }
    if (performance.now() - lastTouchMove < touchMoveThrottle) return;
    lastTouchMove = performance.now();
    let touchEndX = e.touches[0].clientX;
    const swipeThreshold = 50 / window.devicePixelRatio;
    if (Math.abs(touchEndX - touchStartX) > swipeThreshold) {
        hasSwiped = true;
        moveDirection = touchEndX > touchStartX ? 1 : -1;
    }
}, { passive: false });

gameArea.addEventListener('touchend', (e) => {
    if (!isGameOver) e.preventDefault();
    setTimeout(() => {
        moveDirection = 0;
        if (!hasSwiped) jump();
        hasSwiped = false;
    }, 50);
}, { passive: false });

character.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isMobile) jump();
});

restartButton.addEventListener('click', () => {
    restartGame();
});

gameOverDisplay.addEventListener('click', (e) => {
    if (e.target.id !== 'game-over-restart') return;
    restartGame();
});

gameOverDisplay.addEventListener('keydown', (e) => {
    if (e.code === 'Enter') {
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
        lastTurnTime = 0; // Reset turn cooldown
        character.style.left = `${characterX}%`;
        character.style.transform = `translateX(-50%) rotateY(0deg) translateZ(0)`;
        character.style.backgroundImage = `url("${selectedCharacterImage}")`;
        if (scoreDisplay) scoreDisplay.textContent = `得分: ${score} | 最高分: ${highScore}`;
        if (lifeDisplay) lifeDisplay.textContent = `生命: ${life}`;
        if (levelDisplay) levelDisplay.textContent = `等级: ${level}`;
        gameOverDisplay.style.display = 'none';
        gameOverOverlay.style.display = 'none';
        addressContainer.style.display = 'flex';
        gameOverDisplay.innerHTML = `
            <div>游戏结束！</div>
            <div id="game-over-level">等级: ${level}</div>
            <div id="game-over-score">得分: ${score}</div>
            <div id="game-over-high-score">最高分: ${highScore}</div>
            <div id="game-over-life">生命: ${life}</div>
            <div>再试一次，挑战更高分数！</div>
            <button id="game-over-restart" aria-label="重新开始游戏">重新开始</button>
        `;
        console.log('Coins before cleanup:', coins.length, 'coinCount:', coinCount);
        coins.forEach(coin => {
            if (coin.parentNode) {
                coin.cleanup();
                coin.remove();
            }
        });
        coins.length = 0;
        coinCount = 0;
        console.log('Coins after cleanup:', coins.length, 'coinCount:', coinCount);
        cachedCharacterRect = null;
        const initialCoinCount = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < initialCoinCount; i++) {
            spawnCoin();
        }
        lastSpawnTime = performance.now();
        lastCollisionCheck = performance.now();
        lastFrameTime = performance.now();
        updateCoinSpeed();
        updateGameAreaRect();
        startScreen.style.display = 'none';
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
        console.log('Explosion pool size:', explosionPool.length);
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
                console.log('Explosion removed');
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
                if (Math.abs(randomX - (existingRect.left - gameAreaRect.left)) < 100) { // Increased from 80 to 100
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
        }
        highScore = Math.max(highScore, score);
        localStorage.setItem('highScore', highScore);
        if (scoreDisplay) scoreDisplay.textContent = `得分: ${score} | 最高分: ${highScore}`;
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
    } catch (error) {
        console.error('Failed to collect coin:', error, error.stack);
    }
}

function checkCollisions() {
    if (isGameOver) return;
    try {
        if (!cachedCharacterRect) {
            const characterRect = character.getBoundingClientRect();
            const hitboxPaddingX = characterRect.width * 0.15; // Increased from 0.1 to 0.15
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
        console.log('Game over, coins:', coins.length, 'coinCount:', coinCount);
        gameOverDisplay.innerHTML = `
            <div>游戏结束！</div>
            <div id="game-over-level">等级: ${level}</div>
            <div id="game-over-score">得分: ${score}</div>
            <div id="game-over-high-score">最高分: ${highScore}</div>
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
        console.log('Coins after game over cleanup:', coins.length, 'coinCount:', coinCount);
        bgMusic.pause();
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
            lastFrameTime = timestamp;
            const duration = performance.now() - start;
            if (duration > 16) {
                console.warn(`Slow frame: ${duration.toFixed(2)}ms, coins: ${coinCount}, level: ${level}, collision: ${timestamp - lastCollisionCheck}ms, spawn: ${timestamp - lastSpawnTime}ms`);
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
            lastTurnTime = performance.now(); // Reset turn cooldown
            cachedCharacterRect = null;
            updateGameAreaRect();
            updateCoinSpeed();
            addressContainer.style.display = 'flex';
            console.log('Resuming game, state reset');
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
        const scoreDisplay = document.getElementById('score');
        const lifeDisplay = document.getElementById('life');
        const levelDisplay = document.getElementById('level');
        const addressContainer = document.getElementById('address-container');
        const addressText = document.getElementById('address-text');
        const copyButton = document.getElementById('copy-button');
        const gameOverOverlay = document.getElementById('game-over-overlay');
        const missingElements = [];
        if (!scoreDisplay) missingElements.push('score');
        if (!lifeDisplay) missingElements.push('life');
        if (!levelDisplay) missingElements.push('level');
        if (!addressContainer) missingElements.push('address-container');
        if (!addressText) missingElements.push('address-text');
        if (!copyButton) missingElements.push('copy-button');
        if (!gameOverOverlay) missingElements.push('game-over-overlay');
        if (missingElements.length > 0) {
            console.error(`Missing DOM elements during initialization: ${missingElements.join(', ')}`);
            document.body.innerHTML += `<div style="color: red; text-align: center; padding: 10px;">警告：缺少元素 (${missingElements.join(', ')})。游戏可能不完整。</div>`;
        } else {
            scoreDisplay.textContent = `得分: ${score} | 最高分: ${highScore}`;
            lifeDisplay.textContent = `生命: ${life}`;
            levelDisplay.textContent = `等级: ${level}`;
            addressContainer.style.display = 'none';
        }
        startScreen.style.display = 'block';
        characterSelection.style.display = 'none';
        console.log('Initial game state set');
    } catch (error) {
        console.error('Failed to initialize game state:', error, error.stack);
        showError('游戏初始化失败，请检查页面元素并刷新重试。');
    }
});
