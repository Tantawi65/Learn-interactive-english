/* =========================================
   State & Setup
   ========================================= */
   const state = {
    hasMovedRug: false,
    chestOpen: false,
    doorOpen: false,
};

// DOM Elements
const introScreen = document.getElementById('intro-screen');
const gameScreen = document.getElementById('game-screen');
const winScreen = document.getElementById('win-screen');
const startBtn = document.getElementById('start-btn');
const vocabWord = document.getElementById('vocab-word');
const inventorySlots = document.getElementById('inventory-slots');

// Interactive & Drag Elements
const interactives = document.querySelectorAll('.interactive, .collectable');
const targets = document.querySelectorAll('.target');
const rug = document.getElementById('rug');

/* =========================================
   Initialization & Navigation
   ========================================= */
startBtn.addEventListener('click', () => {
    introScreen.classList.remove('active');
    introScreen.classList.add('hidden');
    
    gameScreen.classList.remove('hidden');
    gameScreen.classList.add('active');
});

function winGame() {
    gameScreen.classList.remove('active');
    gameScreen.classList.add('hidden');
    
    winScreen.classList.remove('hidden');
    winScreen.classList.add('active');
}

/* =========================================
   Educational Core: Vocabulary & TTS
   ========================================= */
function speakWord(word) {
    // Web Speech API for TTS
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = 'en-US';
        utterance.rate = 0.9; // Slightly slower for clear pronunciation
        speechSynthesis.speak(utterance);
    }
}

function showVocab(word) {
    if (!word) return;
    vocabWord.textContent = word;
    
    // Add quick animation
    vocabWord.style.animation = 'none';
    vocabWord.offsetHeight; /* trigger reflow */
    vocabWord.style.animation = 'float 0.5s ease';
    
    speakWord(word);
}

// Attach click listeners to all room objects to teach vocabulary
interactives.forEach(el => {
    el.addEventListener('click', (e) => {
        // Prevent default to separate click from drag where necessary
        const word = e.target.getAttribute('data-word');
        showVocab(word);
    });
});

/* =========================================
   Drag and Drop Mechanics
   ========================================= */
let draggedData = null; // Store id of the dragged item
let draggedElement = null;

// Initialize draggable items
document.querySelectorAll('[draggable="true"]').forEach(item => {
    item.addEventListener('dragstart', (e) => {
        draggedData = e.target.getAttribute('data-id');
        draggedElement = e.target;
        e.dataTransfer.setData('text/plain', draggedData);
        showVocab(e.target.getAttribute('data-word'));
    });
});

// Setup targets (Door, Chest)
targets.forEach(target => {
    target.addEventListener('dragover', e => {
        e.preventDefault(); // allow dropping
        target.style.filter = 'drop-shadow(0 0 20px #FF007F)';
    });

    target.addEventListener('dragleave', e => {
        target.style.filter = '';
    });

    target.addEventListener('drop', e => {
        e.preventDefault();
        target.style.filter = '';
        handleDrop(draggedData, target.id);
    });
});

// Specific Drag Behavior: The Rug (Draggable in space, not into inventory right away)
rug.addEventListener('dragend', (e) => {
    if (!state.hasMovedRug) {
        // Just moving the rug reveals the hidden key
        rug.style.transform = 'translateX(200px)';
        document.getElementById('hidden-key').classList.remove('hidden');
        state.hasMovedRug = true;
    }
});

/* =========================================
   Puzzle Logic & Handlers
   ========================================= */
function handleDrop(itemId, targetId) {
    if (itemId === 'key' && targetId === 'chest') {
        if (!state.chestOpen) {
            triggerMiniGame('CHEST', () => unlockChest());
        }
    } else if (itemId === 'book' && targetId === 'door') {
        unlockDoor();
    } else {
        // Wrong item
        showVocab('Try something else!');
    }
}

// Add item to inventory UI
function addToInventory(emoji, id, word) {
    const slot = document.createElement('div');
    slot.className = 'inventory-item';
    slot.draggable = true;
    slot.textContent = emoji;
    slot.setAttribute('data-id', id);
    slot.setAttribute('data-word', word);
    
    // Add drag listeners to new inventory item
    slot.addEventListener('dragstart', (e) => {
        draggedData = id;
        draggedElement = slot;
        e.dataTransfer.setData('text/plain', draggedData);
        showVocab(word);
    });

    // Speak when clicked in inventory
    slot.addEventListener('click', () => showVocab(word));

    inventorySlots.appendChild(slot);
}

// Collectibles in room (e.g., Key)
document.getElementById('hidden-key').addEventListener('click', (e) => {
    const el = e.target;
    addToInventory('🔑', 'key', 'KEY');
    el.remove(); // Remove from room
    showVocab('KEY');
});

// Unlocking actions
function unlockChest() {
    state.chestOpen = true;
    const chest = document.getElementById('chest');
    chest.textContent = '📖'; // Changes to open chest / book
    chest.setAttribute('data-word', 'BLUE BOOK');
    
    // Auto-grant the blue book to inventory
    addToInventory('📘', 'book', 'BLUE BOOK');
    showVocab('CHEST OPENED! YOU FOUND A BOOK!');
    
    // Remove dragged key from inventory
    if (draggedElement && draggedElement.parentNode === inventorySlots) {
        draggedElement.remove();
    }
}

function unlockDoor() {
    // Open door and win
    document.getElementById('door').textContent = '🚪✨';
    setTimeout(winGame, 1000);
}

/* =========================================
   Spelling Mini-Game Logic
   ========================================= */
const minigameModal = document.getElementById('minigame-modal');
const minigameTitle = document.getElementById('minigame-title');
const scrambledContainer = document.getElementById('scrambled-letters');
const answerContainer = document.getElementById('answer-slots');
const feedback = document.getElementById('minigame-feedback');
let currentTargetWord = '';
let currentAnswer = '';
let onMiniGameWin = null;

function triggerMiniGame(word, winCallback) {
    currentTargetWord = word;
    currentAnswer = '';
    onMiniGameWin = winCallback;
    
    minigameModal.classList.remove('hidden');
    setupMiniGameUI();
}

function setupMiniGameUI() {
    scrambledContainer.innerHTML = '';
    answerContainer.textContent = '';
    feedback.textContent = '';
    currentAnswer = '';
    
    // Scramble logic
    let letters = currentTargetWord.split('');
    letters.sort(() => Math.random() - 0.5); // simple shuffle
    
    letters.forEach(letter => {
        const btn = document.createElement('button');
        btn.className = 'letter-btn';
        btn.textContent = letter;
        btn.onclick = () => selectLetter(letter, btn);
        scrambledContainer.appendChild(btn);
    });
}

function selectLetter(letter, btnNode) {
    currentAnswer += letter;
    answerContainer.textContent = currentAnswer;
    btnNode.style.visibility = 'hidden'; // Hide used letter
    speakWord(letter); // Phonics/letter reinforcement
    
    // Check win condition
    if (currentAnswer.length === currentTargetWord.length) {
        if (currentAnswer === currentTargetWord) {
            feedback.style.color = '#00F0FF';
            feedback.textContent = 'Correct! 🌟';
            speakWord('Correct');
            setTimeout(() => {
                minigameModal.classList.add('hidden');
                if (onMiniGameWin) onMiniGameWin();
            }, 1000);
        } else {
            feedback.style.color = '#FF007F';
            feedback.textContent = 'Oops! Try again.';
            setTimeout(setupMiniGameUI, 1000); // Reset
        }
    }
}

document.getElementById('reset-minigame-btn').addEventListener('click', setupMiniGameUI);
