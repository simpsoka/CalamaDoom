import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

/**
 * DOOM-like Prototype
 * ===================
 * A simple FPS built with Three.js.
 * 
 * Key Systems:
 * - Grid-based level generation
 * - PointerLockControls for FPS movement
 * - Simple projectile system
 * - Basic enemy AI (chase player)
 * - Game state management (Health, Ammo, Score)
 */

// --- Configuration ---
const CONFIG = {
    PLAYER_SPEED: 40.0,
    PLAYER_RADIUS: 0.5,
    ENEMY_SPEED_BASE: 2.5,
    ENEMY_DAMAGE_RATE: 30, // Health per second
    PROJECTILE_SPEED: 60,
    PROJECTILE_LIFESPAN: 1.5, // Seconds
    UNIT_SIZE: 3, // Size of grid blocks in world units
};

// --- Global Game State ---
const GAME_STATE = {
    health: 100,
    ammo: 40,
    score: 0,
    isGameOver: false
};

const KEY_STATE = {};

// --- Setup Scene, Camera, Renderer ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);
scene.fog = new THREE.Fog(0x111111, 0, 30); // Hides map edges and adds atmosphere

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.y = 1.6; // Approx eye height

const renderer = new THREE.WebGLRenderer({ antialias: false }); // False for retro gritty look
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// --- Lighting ---
const ambientLight = new THREE.AmbientLight(0x444444);
scene.add(ambientLight);

// Add a strong directional light for overall scene visibility
const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(5, 10, 5); // Position it high and to the side
scene.add(sun);

// Flashlight attached to camera to see in dark corners
const flashLight = new THREE.PointLight(0xffffff, 0.8, 25);
camera.add(flashLight);
scene.add(camera);

// --- UI & HUD Management ---
const hudHealth = document.getElementById('health');
const hudAmmo = document.getElementById('ammo');
const hudScore = document.getElementById('score');
const centerHud = document.getElementById('center-hud');
const hudContainer = document.getElementById('hud');

function updateHUD() {
    hudHealth.textContent = Math.max(0, Math.floor(GAME_STATE.health));
    hudAmmo.textContent = GAME_STATE.ammo;
    hudScore.textContent = GAME_STATE.score;
    
    // Visual feedback for low health
    if (GAME_STATE.health <= 25) {
        hudContainer.style.color = 'red';
    } else if (GAME_STATE.health <= 50) {
        hudContainer.style.color = 'orange';
    } else {
        hudContainer.style.color = 'lime';
    }
}

function gameOver() {
    if (GAME_STATE.isGameOver) return;
    GAME_STATE.isGameOver = true;
    centerHud.textContent = "GAME OVER - Score: " + GAME_STATE.score;
    centerHud.style.display = 'block';
    controls.unlock();
}

function gameWin() {
    if (GAME_STATE.isGameOver) return;
    GAME_STATE.isGameOver = true;
    centerHud.textContent = "LEVEL CLEARED! - Score: " + GAME_STATE.score;
    centerHud.style.color = 'lime';
    centerHud.style.display = 'block';
    controls.unlock();
}

// --- Input & Controls ---
const controls = new PointerLockControls(camera, renderer.domElement);
const blocker = document.getElementById('blocker');
const instructions = document.getElementById('instructions');

// Handle pointer lock state changes
renderer.domElement.addEventListener('click', () => {
    if (!GAME_STATE.isGameOver) controls.lock();
});

controls.addEventListener('lock', () => {
    instructions.style.display = 'none';
    blocker.style.display = 'none';
});

controls.addEventListener('unlock', () => {
    // Only show pause menu if game isn't over
    if (!GAME_STATE.isGameOver) {
        blocker.style.display = 'flex';
        instructions.style.display = '';
    }
    // Clear key states to prevent "stuck" movement after unlocking
    for (let key in KEY_STATE) KEY_STATE[key] = false;
});

window.addEventListener('keydown', (e) => {
    KEY_STATE[e.code] = true;
    // Emergency exit
    if (e.code === 'Backquote') {
        controls.unlock();
    }
});
window.addEventListener('keyup', (e) => KEY_STATE[e.code] = false);
renderer.domElement.addEventListener('mousedown', (e) => {
    if (controls.isLocked && e.button === 0) shoot();
});

// --- Level Generation & World ---
// 1 = Wall, 0 = Empty, P = Player Start, E = Enemy, X = Exit goal
const LEVEL_MAP = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,'P',0,0,0,0,1,0,0,0,1,0,0,'E',1],
    [1,0,1,1,1,0,1,0,1,0,1,0,1,0,1],
    [1,0,0,0,1,0,0,0,1,0,0,0,1,0,1],
    [1,1,1,0,1,1,1,1,1,1,1,1,1,0,1],
    [1,0,0,0,0,0,0,'E',0,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,1,1,0,1,1,1,0,1],
    [1,0,1,'E',0,0,0,0,1,0,1,0,0,0,1],
    [1,0,1,0,1,1,1,0,1,0,1,0,1,1,1],
    [1,0,0,0,1,0,0,0,1,0,1,0,0,0,1],
    [1,1,1,1,1,0,1,1,1,0,1,1,1,0,1],
    [1,'E',0,0,0,0,1,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,1,1,0,1,1,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,'E','X',1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

// Assets (using placeholders for simplicity, easily replaceable)
const wallTex = new THREE.TextureLoader().load('https://placehold.co/128x128/555/888.png?text=WALL');
wallTex.magFilter = THREE.NearestFilter;
const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, color: 0x999999, roughness: 0.8 });
const wallGeo = new THREE.BoxGeometry(CONFIG.UNIT_SIZE, CONFIG.UNIT_SIZE * 1.5, CONFIG.UNIT_SIZE);
const exitMat = new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00aa00, roughness: 0.2 });

function buildLevel(map) {
    for (let z = 0; z < map.length; z++) {
        for (let x = 0; x < map[z].length; x++) {
            const cell = map[z][x];
            const posX = x * CONFIG.UNIT_SIZE;
            const posZ = z * CONFIG.UNIT_SIZE;

            if (cell === 1) {
                const wall = new THREE.Mesh(wallGeo, wallMat);
                wall.position.set(posX, (CONFIG.UNIT_SIZE * 1.5) / 2, posZ);
                scene.add(wall);
            } else if (cell === 'P') {
                camera.position.set(posX, 1.6, posZ);
                // Look towards an open area (+X) instead of the center
                camera.lookAt(new THREE.Vector3(camera.position.x + CONFIG.UNIT_SIZE * 2, 1.6, camera.position.z));
            } else if (cell === 'E') {
                spawnEnemy(posX, posZ);
            } else if (cell === 'X') {
                // Exit goal
                const exit = new THREE.Mesh(new THREE.BoxGeometry(CONFIG.UNIT_SIZE/2, CONFIG.UNIT_SIZE, CONFIG.UNIT_SIZE/2), exitMat);
                exit.position.set(posX, CONFIG.UNIT_SIZE/2, posZ);
                exit.userData.isExit = true;
                scene.add(exit);
            }
        }
    }
}

// Floor
const mapW = LEVEL_MAP[0].length * CONFIG.UNIT_SIZE;
const mapH = LEVEL_MAP.length * CONFIG.UNIT_SIZE;
const floorMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(mapW, mapH),
    new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8, metalness: 0.1 })
);
floorMesh.rotation.x = -Math.PI / 2;
floorMesh.position.set((mapW / 2) - (CONFIG.UNIT_SIZE / 2), 0, (mapH / 2) - (CONFIG.UNIT_SIZE / 2));
scene.add(floorMesh);


// --- Entities: Enemies ---
const enemies = [];
// Simple capsule representation for enemies
const enemyGeo = new THREE.CapsuleGeometry(0.4, 0.8, 4, 8);
const enemyMat = new THREE.MeshStandardMaterial({ color: 0xaa0000, roughness: 0.5 });

function spawnEnemy(x, z) {
    const enemy = new THREE.Mesh(enemyGeo, enemyMat);
    enemy.position.set(x, 0.8, z); // 0.8 y puts it on the floor (height 1.6 total)
    enemy.userData = { 
        health: 3, 
        speed: CONFIG.ENEMY_SPEED_BASE + Math.random() // slight speed variation
    };
    scene.add(enemy);
    enemies.push(enemy);
}

function updateEnemies(delta) {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        const dirToPlayer = new THREE.Vector3().subVectors(camera.position, enemy.position);
        dirToPlayer.y = 0; // Don't fly or sink
        const dist = dirToPlayer.length();

        // Chase player if visible (simple distance check for now)
        if (dist < 20 && dist > 0.6) {
            dirToPlayer.normalize();
            const move = dirToPlayer.multiplyScalar(enemy.userData.speed * delta);
            
            // Try move X
            enemy.position.x += move.x;
            if (checkCollision(enemy.position.x, enemy.position.z)) enemy.position.x -= move.x;
            // Try move Z
            enemy.position.z += move.z;
            if (checkCollision(enemy.position.x, enemy.position.z)) enemy.position.z -= move.z;
        }

        // Damage player
        if (dist < 1.0) {
            GAME_STATE.health -= CONFIG.ENEMY_DAMAGE_RATE * delta;
            updateHUD();
            if (GAME_STATE.health <= 0) gameOver();
        }
    }
}

// --- Entities: Projectiles ---
const projectiles = [];
const projGeo = new THREE.SphereGeometry(0.1);
const projMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });

function shoot() {
    if (GAME_STATE.ammo <= 0 || GAME_STATE.isGameOver) return;
    
    GAME_STATE.ammo--;
    updateHUD();

    const bullet = new THREE.Mesh(projGeo, projMat);
    bullet.position.copy(camera.position);
    // Slight offset so we don't see it inside the camera
    bullet.translateZ(-0.5); 
    
    camera.getWorldDirection(bullet.userData.velocity = new THREE.Vector3()).multiplyScalar(CONFIG.PROJECTILE_SPEED);
    bullet.userData.life = CONFIG.PROJECTILE_LIFESPAN;
    
    scene.add(bullet);
    projectiles.push(bullet);
}

function updateProjectiles(delta) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const b = projectiles[i];
        b.position.addScaledVector(b.userData.velocity, delta);
        b.userData.life -= delta;

        // Remove if hit wall or expired
        if (checkCollision(b.position.x, b.position.z) || b.userData.life <= 0) {
            scene.remove(b);
            projectiles.splice(i, 1);
            continue;
        }

        // Check hit on enemies
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            // Simple cylinder-ish hit check
            if (Math.abs(b.position.y - enemy.position.y) < 0.8 && 
                new THREE.Vector2(b.position.x, b.position.z).distanceTo(new THREE.Vector2(enemy.position.x, enemy.position.z)) < 0.6) {
                
                enemy.userData.health--;
                // Bullet destroyed on impact
                scene.remove(b);
                projectiles.splice(i, 1);

                // Enemy death
                if (enemy.userData.health <= 0) {
                    scene.remove(enemy);
                    enemies.splice(j, 1);
                    GAME_STATE.score += 100;
                    updateHUD();
                }
                break; // Bullet can only hit one enemy
            }
        }
    }
}

// --- Physics & Collision Helpers ---
function checkCollision(x, z) {
    // Convert world pos to grid pos
    const gx = Math.floor((x + CONFIG.UNIT_SIZE/2) / CONFIG.UNIT_SIZE);
    const gz = Math.floor((z + CONFIG.UNIT_SIZE/2) / CONFIG.UNIT_SIZE);
    
    // Check bounds
    if (gx < 0 || gx >= LEVEL_MAP[0].length || gz < 0 || gz >= LEVEL_MAP.length) return true;
    
    return LEVEL_MAP[gz][gx] === 1;
}

function checkExit(x, z) {
    const gx = Math.floor((x + CONFIG.UNIT_SIZE/2) / CONFIG.UNIT_SIZE);
    const gz = Math.floor((z + CONFIG.UNIT_SIZE/2) / CONFIG.UNIT_SIZE);
    if (gx >= 0 && gx < LEVEL_MAP[0].length && gz >= 0 && gz < LEVEL_MAP.length) {
        return LEVEL_MAP[gz][gx] === 'X';
    }
    return false;
}


// --- Main Game Loop ---
let prevTime = performance.now();
const vel = new THREE.Vector3(); // Player velocity for smooth movement
const dir = new THREE.Vector3(); // Input direction

function animate() {
    requestAnimationFrame(animate);
    
    const time = performance.now();
    const delta = Math.min((time - prevTime) / 1000, 0.1); // Cap delta to prevent huge jumps on tab switch
    prevTime = time;

    if (!GAME_STATE.isGameOver) {
        // --- Player Physics ---
        if (controls.isLocked) {
            // Damping
            vel.x -= vel.x * 10.0 * delta;
            vel.z -= vel.z * 10.0 * delta;

            // Input processing
            dir.z = Number(KEY_STATE['KeyW']||KEY_STATE['ArrowUp']) - Number(KEY_STATE['KeyS']||KEY_STATE['ArrowDown']);
            dir.x = Number(KEY_STATE['KeyD']||KEY_STATE['ArrowRight']) - Number(KEY_STATE['KeyA']||KEY_STATE['ArrowLeft']);
            dir.normalize();

            if (dir.z || dir.x) {
                 vel.z -= dir.z * CONFIG.PLAYER_SPEED * delta;
                 vel.x -= dir.x * CONFIG.PLAYER_SPEED * delta;
            }

            // Apply movement with individual axis collision checks (sliding)
            controls.moveRight(-vel.x * delta);
            if (checkCollision(camera.position.x, camera.position.z)) {
                controls.moveRight(vel.x * delta); // Undo move
                vel.x = 0;
            }
            controls.moveForward(-vel.z * delta);
            if (checkCollision(camera.position.x, camera.position.z)) {
                controls.moveForward(vel.z * delta); // Undo move
                vel.z = 0;
            }

            // Check for level exit
            if (checkExit(camera.position.x, camera.position.z)) {
                gameWin();
            }
        }

        // --- Game World Updates ---
        updateEnemies(delta);
        updateProjectiles(delta);
    }

    renderer.render(scene, camera);
}

// Handle window resizing
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Initialization ---
buildLevel(LEVEL_MAP);
updateHUD();
animate();