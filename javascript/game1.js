document.addEventListener("DOMContentLoaded", function () {
    const board = document.getElementById("game-board");
    const resetButton = document.getElementById("reset-button");

    let tiles = [];
    let emptyIndex = 15; 

    function initBoard() {
        tiles = [...Array(15).keys()].map(n => n + 1); 
        tiles.push(null); 
        shuffleBoard();
        renderBoard();
    }

    function shuffleBoard() {
        for (let i = tiles.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
        }
        emptyIndex = tiles.indexOf(null);
    }

    function renderBoard() {
        board.innerHTML = "";
        tiles.forEach((tile, index) => {
            const tileElement = document.createElement("div");
            tileElement.classList.add("tile");
            if (tile === null) {
                tileElement.classList.add("empty");
            } else {
                tileElement.textContent = tile;
                tileElement.addEventListener("click", () => moveTile(index));
            }
            board.appendChild(tileElement);
        });
    }

    function moveTile(index) {
        const validMoves = [emptyIndex - 1, emptyIndex + 1, emptyIndex - 4, emptyIndex + 4];

        if (validMoves.includes(index)) {
            [tiles[emptyIndex], tiles[index]] = [tiles[index], tiles[emptyIndex]];
            emptyIndex = index;
            renderBoard();
            checkWin();
        }
    }

    function checkWin() {
        if (tiles.slice(0, 15).every((tile, index) => tile === index + 1)) {
            setTimeout(() => alert("ยินดีด้วย! คุณชนะแล้ว!"), 200);
        }
    }

    resetButton.addEventListener("click", initBoard);

    initBoard();
});
