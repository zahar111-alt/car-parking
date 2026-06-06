const car = document.getElementById('car');
const speedVal = document.getElementById('speedVal');
const levelVal = document.getElementById('levelVal');
const slot = document.getElementById('parkingSlot');
const menu = document.getElementById('menu');
const gameArea = document.getElementById('gameArea');

let obstacles = [];
let state = {
    x: 100, y: 450,
    angle: 0,
    speed: 0,
    accel: 0.16,
    decel: 0.08,
    maxSpeed: 4.8,
    isDriving: false,
    currentLevel: 1,
    totalLevels: 67,
    isTransitioning: false,
    drift: 0,
    steering: 0
};

const keys = {};
window.onkeydown = (e) => keys[e.code] = true;
window.onkeyup = (e) => keys[e.code] = false;

// Запуск игры
function startParking() {
    state.isDriving = true;
    menu.style.display = 'none';
    loadLevel(1);
    requestAnimationFrame(gameLoop);
}

// Загрузка уровня
function loadLevel(lvl) {
    state.isTransitioning = true;
    state.currentLevel = lvl;
    levelVal.innerText = lvl;
    
    // Очистка старых объектов
    obstacles.forEach(obs => obs.remove());
    obstacles = [];
    car.classList.remove('collision');

    // Позиция игрока
    state.x = 60;
    state.y = 520;
    state.angle = 0;
    state.speed = 0;
    state.drift = 0;

    // Позиция слота
    const slotX = 150 + (Math.random() * 680);
    const slotY = 80 + (Math.random() * 380);
    const slotAngle = (lvl > 2) ? Math.floor(Math.random() * 8) * 45 : 0;

    slot.style.left = slotX + 'px';
    slot.style.top = slotY + 'px';
    slot.style.transform = `rotate(${slotAngle}deg)`;
    slot.style.borderColor = 'var(--neon-gold)';

    // Создание реалистичного трафика
    const obsCount = Math.min(Math.floor(lvl / 1.5) + 3, 20);
    for (let i = 0; i < obsCount; i++) {
        createRealisticObstacle(slotX, slotY);
    }

    setTimeout(() => { state.isTransitioning = false; }, 400);
}

function createRealisticObstacle(sX, sY) {
    const container = document.createElement('div');
    const colors = ['obs-silver', 'obs-blue', 'obs-white', 'obs-red'];
    container.className = `car-model ${colors[Math.floor(Math.random() * colors.length)]} obstacle`;
    container.innerHTML = `<div class="car-body"><div class="car-lights-front"></div><div class="car-glass"></div><div class="car-lights-rear"></div></div>`;
    
    let oX, oY;
    let attempts = 0;
    do {
        oX = 50 + Math.random() * 800;
        oY = 50 + Math.random() * 500;
        attempts++;
    } while (
        ((Math.abs(oX - state.x) < 80 && Math.abs(oY - state.y) < 120) || 
        (Math.abs(oX - sX) < 80 && Math.abs(oY - sY) < 120)) && attempts < 50
    );

    container.style.left = oX + 'px';
    container.style.top = oY + 'px';
    container.style.transform = `rotate(${Math.random() > 0.5 ? 0 : 90}deg)`;
    gameArea.appendChild(container);
    obstacles.push(container);
}

function createSmoke() {
    const smoke = document.createElement('div');
    smoke.className = 'smoke';
    // Дым идет из-под задней части авто
    const smokeX = state.x + 10 + Math.random() * 20;
    const smokeY = state.y + 40 + Math.random() * 20;
    smoke.style.left = smokeX + 'px';
    smoke.style.top = smokeY + 'px';
    gameArea.appendChild(smoke);
    setTimeout(() => smoke.remove(), 600);
}

function gameLoop() {
    if (!state.isDriving) return;

    if (!state.isTransitioning) {
        // Управление газом
        if (keys['KeyW']) {
            state.speed = Math.min(state.speed + state.accel, state.maxSpeed);
        } else if (keys['KeyS']) {
            state.speed = Math.max(state.speed - state.accel, -state.maxSpeed / 2);
        } else {
            state.speed *= 0.96;
            if (Math.abs(state.speed) < 0.1) state.speed = 0;
        }

        // Мягкий дрифт
        let turnPower = 2.8;
        if (keys['KeyA']) {
            state.steering = -turnPower;
            if (state.speed > 3.8) { // Дрифт только на большой скорости
                state.drift = Math.min(state.drift + 0.15, 5); 
                createSmoke();
            }
        } else if (keys['KeyD']) {
            state.steering = turnPower;
            if (state.speed > 3.8) {
                state.drift = Math.min(state.drift + 0.15, 5);
                createSmoke();
            }
        } else {
            state.steering = 0;
            state.drift *= 0.85;
        }

        // Поворот с учетом направления движения
        const moveDir = state.speed >= 0 ? 1 : -1;
        state.angle += (state.steering + (state.drift * 0.4 * (state.steering > 0 ? 1 : -1))) * moveDir;

        // Физика перемещения
        state.x += Math.sin(state.angle * Math.PI / 180) * state.speed;
        state.y -= Math.cos(state.angle * Math.PI / 180) * state.speed;

        // Границы экрана
        state.x = Math.max(5, Math.min(855, state.x));
        state.y = Math.max(5, Math.min(515, state.y));

        // Отрисовка
        car.style.left = state.x + 'px';
        car.style.top = state.y + 'px';
        car.style.transform = `rotate(${state.angle}deg)`;
        
        speedVal.innerText = Math.round(Math.abs(state.speed) * 18);

        checkParking();
        checkCollisions();
    }
    requestAnimationFrame(gameLoop);
}

function checkParking() {
    const sRect = slot.getBoundingClientRect();
    const cRect = car.getBoundingClientRect();

    const isInside = (
        cRect.left > sRect.left - 8 &&
        cRect.right < sRect.right + 8 &&
        cRect.top > sRect.top - 8 &&
        cRect.bottom < sRect.bottom + 8
    );

    if (isInside && Math.abs(state.speed) < 0.1) {
        state.isTransitioning = true;
        slot.style.borderColor = 'var(--neon-green)';
        gameArea.classList.add('win-flash');
        
        setTimeout(() => {
            gameArea.classList.remove('win-flash');
            if (state.currentLevel < state.totalLevels) {
                loadLevel(state.currentLevel + 1);
            } else {
                alert("ЛЕГЕНДА AUDI: 67 УРОВНЕЙ ПРОЙДЕНО!");
                location.reload();
            }
        }, 800);
    }
}

function checkCollisions() {
    const carRect = car.getBoundingClientRect();
    for (let obs of obstacles) {
        const obsRect = obs.getBoundingClientRect();
        const hit = !(carRect.right < obsRect.left + 5 || carRect.left > obsRect.right - 5 || 
                      carRect.bottom < obsRect.top + 5 || carRect.top > obsRect.bottom - 5);
        if (hit) {
            state.speed = 0;
            state.isTransitioning = true;
            car.classList.add('collision');
            setTimeout(() => { loadLevel(state.currentLevel); }, 600);
            break;
        }
    }
}
// НАСТРОЙКА ИНТЕРФЕЙСА УПРАВЛЕНИЯ (РУЛЬ И ПЕДАЛИ)
const wheel = document.getElementById('steeringWheel');
const gasPedal = document.getElementById('btn-gas');
const brakePedal = document.getElementById('btn-brake');

let isRotating = false;
let startAngle = 0;
let currentWheelAngle = 0;
const MAX_WHEEL_ANGLE = 90; // Максимальный угол поворота руля в одну сторону

// 1. ЛОГИКА ПЕДАЛЕЙ (ГАЗ / ТОРМОЗ)
const bindPedal = (element, keyCode) => {
    const startAction = (e) => { e.preventDefault(); keys[keyCode] = true; };
    const endAction = () => { keys[keyCode] = false; };
    
    element.addEventListener('touchstart', startAction);
    element.addEventListener('touchend', endAction);
    element.addEventListener('mousedown', startAction);
    element.addEventListener('mouseup', endAction);
    element.addEventListener('mouseleave', endAction);
};

bindPedal(gasPedal, 'KeyW');
bindPedal(brakePedal, 'KeyS');

// 2. ЛОГИКА ИНТЕРАКТИВНОГО РУЛЯ
function getEventAngle(e) {
    const rect = wheel.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    return Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);
}

function handleStart(e) {
    isRotating = true;
    startAngle = getEventAngle(e) - currentWheelAngle;
}

function handleMove(e) {
    if (!isRotating) return;
    if(e.touches) e.preventDefault();

    let angle = getEventAngle(e) - startAngle;
    
    // Ограничиваем угол поворота руля
    if (angle > 180) angle -= 360;
    if (angle < -180) angle += 360;
    currentWheelAngle = Math.max(-MAX_WHEEL_ANGLE, Math.min(MAX_WHEEL_ANGLE, angle));
    
    // Визуальный поворот руля
    wheel.style.transform = `rotate(${currentWheelAngle}deg)`;
    
    // Перевод угла руля в системные клавиши A / D
    // Если руль повёрнут более чем на 15 градусов в сторону
    keys['KeyA'] = currentWheelAngle < -15;
    keys['KeyD'] = currentWheelAngle > 15;
}

function handleEnd() {
    if (!isRotating) return;
    isRotating = false;
    
    // Возврат руля в исходное положение (автоцентрование)
    currentWheelAngle = 0;
    wheel.style.transform = 'rotate(0deg)';
    keys['KeyA'] = false;
    keys['KeyD'] = false;
}

// Регистрация событий для сенсора и мыши
wheel.addEventListener('mousedown', handleStart);
window.addEventListener('mousemove', handleMove);
window.addEventListener('mouseup', handleEnd);

wheel.addEventListener('touchstart', handleStart, { passive: false });
window.addEventListener('touchmove', handleMove, { passive: false });
window.addEventListener('touchend', handleEnd);
