document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const gameBoard = document.getElementById('game-board');
    const scoreDisplay = document.getElementById('score');
    const timerDisplay = document.getElementById('timer');
    const refreshBtn = document.getElementById('item-refresh');
    const knightBtn = document.getElementById('item-knight');
    const bombBtn = document.getElementById('item-bomb');
    const gameOverModal = document.getElementById('game-over-modal');
    const finalScoreDisplay = document.getElementById('final-score');
    const restartBtn = document.getElementById('restart-button');

    // Game Constants
    const rows = 8;
    const cols = 8;
    const jewelColors = ['color-1', 'color-2', 'color-3', 'color-4', 'color-5'];

    // Game State
    let board = [];
    let score = 0;
    let timer = 60;
    let timerInterval = null;
    let selectedJewel = null;
    let isProcessing = false;
    let activeItem = null;

    function startGame() {
        isProcessing = true; // Stop any interactions while setting up
        stopTimer();

        score = 0;
        timer = 60;
        activeItem = null;
        scoreDisplay.textContent = score;
        timerDisplay.textContent = timer;
        gameOverModal.classList.add('hidden');
        document.querySelectorAll('.item-button').forEach(btn => { 
            btn.disabled = false; 
            btn.classList.remove('active');
        });

        board = [];
        for (let r = 0; r < rows; r++) {
            board[r] = [];
            for (let c = 0; c < cols; c++) {
                let randomColor;
                do {
                    randomColor = jewelColors[Math.floor(Math.random() * jewelColors.length)];
                } while (
                    (c >= 2 && board[r][c - 1] === randomColor && board[r][c - 2] === randomColor) ||
                    (r >= 2 && board[r - 1][c] === randomColor && board[r - 2][c] === randomColor)
                );
                board[r][c] = randomColor;
            }
        }
        renderBoard();
        isProcessing = false;
        startTimer();
    }

    function renderBoard() {
        gameBoard.innerHTML = '';
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (board[r][c]) {
                    const jewel = document.createElement('div');
                    jewel.classList.add('jewel', board[r][c]);
                    jewel.dataset.row = r;
                    jewel.dataset.col = c;
                    jewel.style.gridRowStart = r + 1;
                    jewel.style.gridColumnStart = c + 1;
                    gameBoard.appendChild(jewel);
                }
            }
        }
    }

    // --- TIMER LOGIC ---
    function startTimer() {
        if (timer > 0 && !isProcessing) {
            stopTimer(); // Ensure no multiple timers
            timerInterval = setInterval(() => {
                timer--;
                timerDisplay.textContent = timer;
                if (timer <= 0) {
                    gameOver();
                }
            }, 1000);
        }
    }

    function stopTimer() {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    function gameOver() {
        stopTimer();
        isProcessing = true;
        finalScoreDisplay.textContent = score;
        gameOverModal.classList.remove('hidden');
    }

    // --- MAIN GAME LOGIC ---
    async function processMove(r1, c1, r2, c2, isItemMove = false) {
        if (isProcessing) return;
        isProcessing = true;
        stopTimer();

        [board[r1][c1], board[r2][c2]] = [board[r2][c2], board[r1][c1]];
        if (!isItemMove) renderBoard(); // Only render swap for normal moves
        
        await new Promise(resolve => setTimeout(resolve, 100));

        let matches = findMatches();
        if (matches.length === 0 && !isItemMove) {
            [board[r1][c1], board[r2][c2]] = [board[r2][c2], board[r1][c1]];
            renderBoard();
            await new Promise(resolve => setTimeout(resolve, 100));
        } else {
            if (matches.length > 0) timer += 3;
            
            while (matches.length > 0) {
                score += calculateScore(matches.length);
                await animateRemoval(matches);
                matches.forEach(match => { board[match.r][match.c] = null; });
                dropJewels();
                fillJewels();
                matches = findMatches();
            }
            renderBoard();
        }
        
        isProcessing = false;
        startTimer();
    }

    function calculateScore(numMatches) {
        if (numMatches >= 5) return 100;
        if (numMatches === 4) return 50;
        return 30;
    }

    // --- EVENT HANDLERS ---
    gameBoard.addEventListener('click', async (e) => {
        if (isProcessing) return;
        const clickedJewel = e.target.closest('.jewel');
        if (!clickedJewel) return;

        const r = parseInt(clickedJewel.dataset.row);
        const c = parseInt(clickedJewel.dataset.col);

        if (activeItem) {
            const item = activeItem;
            activeItem = null; // Consume item on click
            document.querySelector('.item-button.active')?.classList.remove('active');

            if (item === 'bomb') {
                await handleBomb(r, c);
            } else if (item === 'knight') {
                handleKnight(r, c, clickedJewel);
            }
        } else {
            if (!selectedJewel) {
                selectedJewel = { r, c, element: clickedJewel };
                clickedJewel.classList.add('selected');
            } else {
                const { r: r1, c: c1 } = selectedJewel;
                selectedJewel.element.classList.remove('selected');
                if (r1 !== r || c1 !== c) { // Not the same jewel
                    const isAdjacent = Math.abs(r1 - r) + Math.abs(c1 - c) === 1;
                    if (isAdjacent) {
                        await processMove(r1, c1, r, c);
                    }
                }
                selectedJewel = null;
            }
        }
    });

    refreshBtn.addEventListener('click', () => {
        if (isProcessing) return;
        isProcessing = true;
        stopTimer();
        const flatBoard = board.flat();
        for (let i = flatBoard.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [flatBoard[i], flatBoard[j]] = [flatBoard[j], flatBoard[i]];
        }
        for (let r = 0; r < rows; r++) {
            board[r] = flatBoard.slice(r * cols, (r + 1) * cols);
        }
        // A full restart is the safest way to prevent post-shuffle matches
        startGame();
        refreshBtn.disabled = true;
    });

    knightBtn.addEventListener('click', () => { if(!isProcessing) setActiveItem('knight', knightBtn); });
    bombBtn.addEventListener('click', () => { if(!isProcessing) setActiveItem('bomb', bombBtn); });
    restartBtn.addEventListener('click', startGame);

    function setActiveItem(item, btn) {
        document.querySelector('.item-button.active')?.classList.remove('active');
        if (activeItem === item) {
            activeItem = null;
        } else {
            activeItem = item;
            btn.classList.add('active');
        }
        selectedJewel = null; // Deselect any jewel when an item is chosen
    }

    async function handleBomb(r, c) {
        isProcessing = true;
        stopTimer();
        const matches = [];
        for (let i = r - 1; i <= r + 1; i++) {
            for (let j = c - 1; j <= c + 1; j++) {
                if (i >= 0 && i < rows && j >= 0 && j < cols) {
                    matches.push({ r: i, c: j });
                }
            }
        }
        score += calculateScore(matches.length);
        await animateRemoval(matches);
        matches.forEach(match => { board[match.r][match.c] = null; });
        dropJewels();
        fillJewels();
        renderBoard();
        bombBtn.disabled = true;
        isProcessing = false;
        startTimer();
    }

    function handleKnight(r, c, jewelElement) {
        if (!selectedJewel) {
            selectedJewel = { r, c, element: jewelElement };
            jewelElement.classList.add('selected');
        } else {
            const { r: r1, c: c1 } = selectedJewel;
            const isKnightMove = (Math.abs(r1 - r) === 2 && Math.abs(c1 - c) === 1) || (Math.abs(r1 - r) === 1 && Math.abs(c1 - c) === 2);
            selectedJewel.element.classList.remove('selected');
            if (isKnightMove) {
                processMove(r1, c1, r, c, true);
                knightBtn.disabled = true;
            }
            selectedJewel = null;
        }
    }

    // --- UTILITY FUNCTIONS ---
    async function animateRemoval(matches) { /* ... same as before ... */ }
    function findMatches() { /* ... same as before ... */ }
    function dropJewels() { /* ... same as before ... */ }
    function fillJewels() { /* ... same as before ... */ }
    // Need to re-paste the utility functions as they were cleared
    async function animateRemoval(matches) {
        const animationPromises = [];
        matches.forEach(match => {
            const { r, c } = match;
            const jewelEl = document.querySelector(`[data-row='${r}'][data-col='${c}']`);
            if (jewelEl) {
                const placeholder = document.createElement('div');
                placeholder.classList.add('placeholder');
                placeholder.style.gridRowStart = r + 1;
                placeholder.style.gridColumnStart = c + 1;
                gameBoard.appendChild(placeholder);
                jewelEl.classList.add('flashing');
                animationPromises.push(new Promise(res => jewelEl.addEventListener('animationend', res, { once: true })));
            }
        });
        await Promise.all(animationPromises);
    }

    function findMatches() {
        const matches = new Set();
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (!board[r][c]) continue;
                const color = board[r][c];
                if (c < cols - 2 && board[r][c+1] === color && board[r][c+2] === color) {
                    [0, 1, 2].forEach(i => matches.add(`${r}-${c+i}`));
                }
                if (r < rows - 2 && board[r+1][c] === color && board[r+2][c] === color) {
                    [0, 1, 2].forEach(i => matches.add(`${r+i}-${c}`));
                }
            }
        }
        return Array.from(matches).map(str => ({ r: parseInt(str.split('-')[0]), c: parseInt(str.split('-')[1]) }));
    }

    function dropJewels() {
        for (let c = 0; c < cols; c++) {
            let writeRow = rows - 1;
            for (let r = rows - 1; r >= 0; r--) {
                if (board[r][c]) {
                    if (r !== writeRow) {
                        board[writeRow][c] = board[r][c];
                        board[r][c] = null;
                    }
                    writeRow--;
                }
            }
        }
    }

    function fillJewels() {
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (!board[r][c]) {
                    board[r][c] = jewelColors[Math.floor(Math.random() * jewelColors.length)];
                }
            }
        }
    }

    // --- INITIAL KICK-OFF ---
    startGame();
});