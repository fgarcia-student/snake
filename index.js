const refreshRate = 200;
const screen = document.getElementById('screen');
const world = screen.getContext('2d');

const faunadb = window.faunadb
const q = faunadb.query
const client = new faunadb.Client({
    secret: 'fnAEtRlqv5AAQnTyzWzlBCu5auXjBzC3scnnTGOo',
    domain: 'db.us.fauna.com', // Adjust if you are using Region Groups
})

class Snakebit {
    constructor(x, y) {
        this.blockSize = 32;
        this.location = [x, y];
    }

    draw = () => {
        world.fillStyle='#0f0';
        world.strokeStyle='#000';
        const [x, y] = this.location;
        world.fillRect(x * this.blockSize, y * this.blockSize, this.blockSize, this.blockSize);
        world.strokeRect(x * this.blockSize, y * this.blockSize, this.blockSize, this.blockSize);
    }
}

class Snake {
    constructor(x, y) {
        this.bits = [new Snakebit(x, y)];
        document.addEventListener('keydown', (e) => {
            this.directionHandler = this.getHandlerForDirection(e.key);
        })
    }

    get firstBit() {
        return this.bits[0];
    }

    get lastBit() {
        return this.bits[this.bits.length - 1];
    }

    getHandlerForDirection = (key) => {
        if (key === 'ArrowLeft') return this.moveLeft;
        if (key === 'ArrowRight') return this.moveRight;
        if (key === 'ArrowUp') return this.moveUp;
        if (key === 'ArrowDown') return this.moveDown;
    }

    move = (iX, iY) => {
        const [firstBit] = this.bits;
        const [fbX, fbY] = firstBit.location;
        firstBit.location = [fbX + iX, fbY + iY];
        let nextLocation = [fbX, fbY];
        for (let x = 1; x < this.bits.length; x++) {
            const bit = this.bits[x];
            const [pbX, pbY] = bit.location;
            bit.location = nextLocation;
            nextLocation = [pbX, pbY];
        }
    }

    moveLeft = () => this.move(-1, 0);

    moveRight = () => this.move(1, 0);

    moveUp = () => this.move(0, -1);

    moveDown = () => this.move(0, 1);

    draw = () => {
        if (this.directionHandler) this.directionHandler();
        for (let x = 0; x < this.bits.length; x++) {
            const bit = this.bits[x];
            bit.draw();
        }
    }
}

class Fruit {
    constructor(x, y) {
        this.blockSize = 32;
        this.location = [x, y];
    }

    draw = () => {
        world.fillStyle='#f00';
        world.strokeStyle='#000';
        const [x, y] = this.location;
        world.fillRect(x * this.blockSize, y * this.blockSize, this.blockSize, this.blockSize);
        world.strokeRect(x * this.blockSize, y * this.blockSize, this.blockSize, this.blockSize);
    }
}

class SnakeMap {
    constructor() {
        this.gridSize = 20; // 20x20 grid
        this.blockSize = 32; // px
    }

    draw = () => {
        for (let x = 0; x < this.gridSize; x++) {
            for (let y = 0; y < this.gridSize; y++) {
                world.fillStyle='antiquewhite';
                world.strokeStyle='#000';
                world.fillRect(x * this.blockSize, y * this.blockSize, this.blockSize, this.blockSize);
                world.strokeRect(x * this.blockSize, y * this.blockSize, this.blockSize, this.blockSize);
            }
        }
    }
}

class Game {
    constructor() {
        this.map = new SnakeMap();
        this.snake = new Snake(10, 10);
        this.fruit = new Fruit(3, 8);
        this.intervalHandle = null;
        this.gameOver = false;
    }

    isGameOver = () => {
        return (
            outOfBounds(this.map.gridSize, this.snake.firstBit) ||
            snakeAteItself(this.snake)
        )
    }

    collectResults = async () => {
        const username = window.prompt("What is your username?", "nobody");
        const results = await client.query(
            q.Create(
                q.Collection('UserEntry'),
                { data: { username, highScore: this.snake.bits.length } }
            )
        );
        addScoreToList(results);
        alert('Highscore saved!');
    }

    resetGame = () => {
        this.map = new SnakeMap();
        this.snake = new Snake(10, 10);
        this.fruit = new Fruit(3, 8);
        this.intervalHandle = null;
        this.gameOver = false;
    }

    draw = () => {
        if (this.gameOver && this.intervalHandle) {
            clearInterval(this.intervalHandle);
            this.intervalHandle = null;
            this.collectResults();
            this.resetGame();
            this.start();
        } else {
            this.map.draw();
            this.fruit.draw();
            this.snake.draw();
            if (this.isGameOver()) {
                this.gameOver = true;
                return;
            }
            if (collided(this.fruit, this.snake.firstBit)) {
                const [x, y] = this.snake.lastBit.location;
                this.snake.bits.push(new Snakebit(x, y));
                this.fruit.location = [randomIntFromInterval(0, 19), randomIntFromInterval(0,19)];
            }
        }
    }

    start = () => {
        this.intervalHandle = setInterval(this.draw, refreshRate);
    }
}

function collided(fruit, firstBit) {
    const [fX, fY] = fruit.location;
    const [sX, sY] = firstBit.location;
    return fX === sX && fY === sY;
}

function outOfBounds(gridSize, firstBit) {
    const [x, y] = firstBit.location;
    return x < 0 || x >= gridSize || y < 0 || y >= gridSize;
}

function snakeAteItself(snake) {
    if (snake.bits.length < 5) return false;
    const [fbX, fbY] = snake.firstBit.location;
    for (let x = 1; x < snake.bits.length; x++) {
        const [bX, bY] = snake.bits[x].location;
        if (fbX === bX && fbY === bY) return true;
    }
    return false;
}

function randomIntFromInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min)
}

function getHighScores() {
    return client.query(q.Map(
        q.Paginate(q.Documents(q.Collection('UserEntry'))),
        q.Lambda(x => q.Get(x))
    ));
}

function addScoreToList(highScore) {
    const elem = document.getElementById('leaderboard');
    const highScoreElement = document.createElement('div');
    highScoreElement.classList.add('highscore');
    highScoreElement.innerHTML = `<div><b>${highScore.data.username}</b> | Score: ${highScore.data.highScore}</div>`;
    elem.prepend(highScoreElement);
}

async function init() {
    const highScores = await getHighScores();
    highScores.data.forEach(addScoreToList)
    const game = new Game();
    game.start();
}

init();
