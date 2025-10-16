document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const gameBoard = document.querySelector('#gameBoard');
    if (!gameBoard) {
        console.error("Canvas element with id='gameBoard' not found.");
        return; 
    }

    const ctx = gameBoard.getContext('2d');
    const currentScoreSpan = document.querySelector('#currentScore');
    const bestScoreSpan = document.querySelector('#bestScore');
    const resetBtn = document.querySelector('#resetBtn');
    const gameContainer = document.querySelector('#gameContainer');

    // --- Game Configuration & State ---
    const HIGH_SCORE_KEY = 'snakeHighScore';
    const boardBackground = 'white';
    const snakeColor = 'lightgreen';
    const snakeBorder = 'black';
    const foodColor = 'red';
    const initialUnitSize = 25; 
    let unitSize = initialUnitSize;
    
    let gameWidth, gameHeight;
    let running = false;
    
    let xVelocity = unitSize; 
    let yVelocity = 0;
    
    let foodX;
    let foodY;
    let score = 0;
    let highScore = 0;
    let snake = [];
    
    // --- Initialization and Event Handlers ---

    // Function to set canvas dimensions responsively and maintain grid
    function setCanvasSize() {
        // Determine the maximum size based on the container width, reserving some padding
        let size = Math.min(gameContainer.clientWidth - 30, 500); 
        
        // Ensure size is a multiple of the unit size
        unitSize = initialUnitSize;
        let units = Math.floor(size / unitSize);
        gameWidth = units * unitSize;
        gameHeight = units * unitSize;

        // Apply size to the canvas element
        gameBoard.width = gameWidth;
        gameBoard.height = gameHeight;
        
        // Recalculate velocity based on new unitSize
        if (running) {
            // Adjust velocities if the game is running, maintaining direction
            xVelocity = xVelocity > 0 ? unitSize : xVelocity < 0 ? -unitSize : 0;
            yVelocity = yVelocity > 0 ? unitSize : yVelocity < 0 ? -unitSize : 0;
        } else {
            // Set initial velocity
            xVelocity = unitSize;
            yVelocity = 0;
        }
    }

    // Set up initial size and event listeners
    setCanvasSize();
    window.addEventListener('resize', () => {
        // If running, stop and allow reset to recalculate position, otherwise just resize
        if (running) {
            running = false;
            displayGameOver("Paused (Resizing)");
        }
        setCanvasSize();
        clearBoard();
        drawFood(); 
        drawSnake();
    });

    // Control direction change via arrow keys
    window.addEventListener('keydown', changeDirection);
    if (resetBtn) { 
        resetBtn.addEventListener('click', resetGame);
    }

    // Start the game loop
    gameStart();

    // --- High Score Logic ---

    function loadHighScore() {
        try {
            const storedScore = localStorage.getItem(HIGH_SCORE_KEY);
            if (storedScore) {
                highScore = parseInt(storedScore, 10);
            }
        } catch (error) {
            console.error("Could not load high score from localStorage:", error);
            highScore = 0; 
        }
        bestScoreSpan.textContent = highScore;
    }

    function saveHighScore() {
        if (score > highScore) {
            highScore = score;
            try {
                localStorage.setItem(HIGH_SCORE_KEY, highScore);
            } catch (error) {
                console.error("Could not save high score to localStorage:", error);
            }
            bestScoreSpan.textContent = highScore;
            return true; // New high score achieved
        }
        return false;
    }

    // --- Game Core Functions ---

    function gameStart() {
        loadHighScore(); 
        
        // Recalculate initial snake position based on current unitSize
        snake = [
            { x: unitSize * 2, y: unitSize * 2 },
            { x: unitSize * 1, y: unitSize * 2 },
            { x: 0, y: unitSize * 2 }
        ];

        xVelocity = unitSize;
        yVelocity = 0;
        score = 0;
        currentScoreSpan.textContent = score;
        
        running = true;
        createFood();
        drawFood();
        nextTick();
    };

    function nextTick() {
        if (running) {
            setTimeout(() => {
                clearBoard();
                drawFood();
                moveSnake();
                drawSnake();
                checkGameOver();
                nextTick();
            }, 150); 
        }
    };
    
    function clearBoard() {
        ctx.fillStyle = boardBackground;
        ctx.fillRect(0, 0, gameWidth, gameHeight);
    };
    
    function createFood() {
        function randomFood(min, max) {
            // Ensure food position snaps to the grid (multiple of unitSize)
            const randNum = Math.round((Math.random() * (max - min) + min) / unitSize) * unitSize; 
            return randNum;
        }
        
        let attempts = 0;
        let foodOnSnake;
        do {
            foodX = randomFood(0, gameWidth - unitSize);
            foodY = randomFood(0, gameHeight - unitSize);
            
            // Check if food spawns on the snake
            foodOnSnake = snake.some(part => part.x === foodX && part.y === foodY);
            
            attempts++;
            if (attempts > (gameWidth/unitSize) * (gameHeight/unitSize) * 2) { 
                // Emergency break if map is nearly full or an issue occurs
                console.warn("Could not find a place for food.");
                break;
            }
        } while(foodOnSnake);
    };
    
    function drawFood() {
        ctx.fillStyle = foodColor;
        // Use a rounded shape for food
        ctx.beginPath();
        ctx.arc(foodX + unitSize / 2, foodY + unitSize / 2, unitSize / 2, 0, 2 * Math.PI);
        ctx.fill();
    };
    
    function moveSnake() {
        // Create the new head position
        const head = {
            x: snake[0].x + xVelocity,
            y: snake[0].y + yVelocity
        }
        snake.unshift(head);
        
        // Check for food consumption
        if (snake[0].x === foodX && snake[0].y === foodY) {
            score += 1;
            currentScoreSpan.textContent = score;
            createFood();
        } else {
            snake.pop(); 
        }
    };
    
    function drawSnake() {
        ctx.strokeStyle = snakeBorder;
        snake.forEach((snakePart, index) => {
            // Draw the head with a different color for clarity
            if (index === 0) {
                ctx.fillStyle = '#00695c';
            } else {
                ctx.fillStyle = snakeColor;
            }
            
            ctx.fillRect(snakePart.x, snakePart.y, unitSize, unitSize);
            ctx.strokeRect(snakePart.x, snakePart.y, unitSize, unitSize);
        })
    };
    
    function changeDirection(event) {
        // Only allow direction change if the game is running
        if (!running) return;

        const keyPressed = event.keyCode;
        const LEFT = 37, UP = 38, RIGHT = 39, DOWN = 40;

        const goingUp = (yVelocity === -unitSize);
        const goingDown = (yVelocity === unitSize);
        const goingRight = (xVelocity === unitSize);
        const goingLeft = (xVelocity === -unitSize); 

        // Prevent reversing direction
        switch(true) { 
            case (keyPressed === LEFT && !goingRight):
                xVelocity = -unitSize;
                yVelocity = 0;
                break;
            case (keyPressed === UP && !goingDown):
                xVelocity = 0;
                yVelocity = -unitSize;
                break;
            case (keyPressed === RIGHT && !goingLeft): 
                xVelocity = unitSize;
                yVelocity = 0;
                break;
            case (keyPressed === DOWN && !goingUp):
                xVelocity = 0;
                yVelocity = unitSize; 
                break;
        }
    };
    
    function checkGameOver() {
        let collision = false;

        // 1. Check collision with walls
        if (snake[0].x < 0 || snake[0].x >= gameWidth || snake[0].y < 0 || snake[0].y >= gameHeight) {
            collision = true;
        }

        // 2. Check collision with self
        for (let i = 1; i < snake.length; i++) {
            if (snake[i].x === snake[0].x && snake[i].y === snake[0].y) {
                collision = true;
                break;
            }
        }

        if (collision) {
            running = false;
            displayGameOver("Game Over!");
        }
    };
    
    function displayGameOver(message = "Game Over!") {
        // Save high score and determine if a new record was set
        const isNewHighScore = saveHighScore(); 
        
        ctx.font = "50px 'Permanent Marker', cursive";
        ctx.fillStyle = "black";
        ctx.textAlign = "center";
        
        // Draw the main message
        ctx.fillText(message, gameWidth / 2, gameHeight / 2 - 50);

        // Draw the final score
        ctx.font = "30px 'Permanent Marker', cursive";
        ctx.fillStyle = "#004d40";
        ctx.fillText(`Final Score: ${score}`, gameWidth / 2, gameHeight / 2);
        
        // Draw High Score specific message
        ctx.font = "24px 'Permanent Marker', cursive";
        if (isNewHighScore) {
            ctx.fillStyle = "red";
            ctx.fillText(`NEW HIGH SCORE!`, gameWidth / 2, gameHeight / 2 + 50);
        } else {
            ctx.fillStyle = "black";
            ctx.fillText(`High Score: ${highScore}`, gameWidth / 2, gameHeight / 2 + 50);
        }
    };
    
    function resetGame() {
        // Ensure the high score is saved one last time before resetting 
        if (!running) {
            saveHighScore(); 
        }
        
        // Reset canvas size to handle potential resize events during game over screen
        setCanvasSize(); 
        
        // Reset game state and start a new game
        gameStart();
    };
});
