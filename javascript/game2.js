const gameBoard = document.getElementById("game-board");
const resetButton = document.getElementById("reset-button");

const icons = ["🍎", "🍌", "🍒", "🍇", "🍉", "🍍", "🥭", "🍋"];
let cards = [...icons, ...icons]; 
let flippedCards = [];
let matchedCards = [];

function shuffle(array) {
    return array.sort(() => Math.random() - 0.5);
}

function createBoard() {
    gameBoard.innerHTML = "";
    shuffledCards = shuffle(cards);
    shuffledCards.forEach((icon, index) => {
        const card = document.createElement("div");
        card.classList.add("card");
        card.dataset.icon = icon;
        card.dataset.index = index;
        card.addEventListener("click", flipCard);
        gameBoard.appendChild(card);
    });
}

function flipCard() {
    if (flippedCards.length < 2 && !this.classList.contains("flipped")) {
        this.classList.add("flipped");
        this.innerHTML = this.dataset.icon;
        flippedCards.push(this);

        if (flippedCards.length === 2) {
            setTimeout(checkMatch, 500);
        }
    }
}

function checkMatch() {
    const [card1, card2] = flippedCards;

    if (card1.dataset.icon === card2.dataset.icon) {
        matchedCards.push(card1, card2);
        flippedCards = [];
        if (matchedCards.length === cards.length) {
            alert("คุณชนะแล้ว!");
        }
    } else {
        card1.classList.remove("flipped");
        card2.classList.remove("flipped");
        card1.innerHTML = "";
        card2.innerHTML = "";
        flippedCards = [];
    }
}

resetButton.addEventListener("click", createBoard);
createBoard();
