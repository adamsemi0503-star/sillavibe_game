document.addEventListener('DOMContentLoaded', () => {
    const gameBoard = document.getElementById('game-board');
    const scoreDisplay = document.getElementById('score');

    const rows = 8;
    const cols = 8;
    const jewelColors = ['color-1', 'color-2', 'color-3', 'color-4', 'color-5'];

    let board = [];
    let score = 0;
    let selectedJewel = null;
    let isProcessing = false;

    function startGame() {
        board = [];
        score = 0;
        scoreDisplay.textContent = score;
        isProcessing = false;

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
    }

    function renderBoard() {
        const jewelsOnBoard = new Map();
        document.querySelectorAll('.jewel').forEach(j => {
            jewelsOnBoard.set(`${j.dataset.row}-${j.dataset.col}`, j);
        });

        gameBoard.innerHTML = ''; // Clear placeholders and old jewels

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

    gameBoard.addEventListener('click', async (e) => {
        if (isProcessing) return;
        const clickedJewel = e.target.closest('.jewel');
        if (!clickedJewel) return;

        if (!selectedJewel) {
            selectedJewel = clickedJewel;
            selectedJewel.classList.add('selected');
        } else {
            isProcessing = true;
            selectedJewel.classList.remove('selected');
            const r1 = parseInt(selectedJewel.dataset.row);
            const c1 = parseInt(selectedJewel.dataset.col);
            const r2 = parseInt(clickedJewel.dataset.row);
            const c2 = parseInt(clickedJewel.dataset.col);

            if (selectedJewel !== clickedJewel && Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1) {
                await handleMove(r1, c1, r2, c2);
            }
            
            selectedJewel = null;
            isProcessing = false;
        }
    });

    async function handleMove(r1, c1, r2, c2) {
        [board[r1][c1], board[r2][c2]] = [board[r2][c2], board[r1][c1]];
        renderBoard();
        await new Promise(resolve => setTimeout(resolve, 100));

        let matches = findMatches();
        if (matches.length === 0) {
            [board[r1][c1], board[r2][c2]] = [board[r2][c2], board[r1][c1]];
            renderBoard();
            await new Promise(resolve => setTimeout(resolve, 100));
            return;
        }

        while (matches.length > 0) {
            score += matches.length * 10;
            scoreDisplay.textContent = score;

            await animateRemoval(matches);
            
            matches.forEach(match => { board[match.r][match.c] = null; });
            dropJewels();
            fillJewels();

            // Re-render the board to be in sync for the next cascade check
            renderBoard();
            await new Promise(resolve => setTimeout(resolve, 400)); // Wait for user to see the new board

            matches = findMatches();
        }
    }

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

    startGame();
});