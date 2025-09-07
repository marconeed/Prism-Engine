// --- INÍCIO: NÚCLEO DO MOTOR DE JOGO (v1.1 - COMPLETO E FINAL) ---

// --- Variáveis Globais ---
let app;
let worldData;
let uiManager;
const gameObjects = new Map();
const textures = {};
let gameState = { score: 0 };

// --- Sistema de Input ---
const keys = {};
window.addEventListener('keydown', (e) => { keys[e.code] = true; });
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

// --- Fábrica de Comportamentos ---
const BEHAVIOR_MAP = {
    'patrol': PatrolBehavior,
    'keyboardMovement': KeyboardMovementBehavior,
    'shooter': ShooterBehavior,
    'screenBounds': ScreenBoundsBehavior,
    'moveInDirection': MoveInDirectionBehavior,
    'destroyOnScreenExit': DestroyOnScreenExitBehavior,
    'animation': AnimationBehavior,
};

// --- Funções Auxiliares do Motor ---

function getAllAssetPaths(data) {
    let assetPaths = [];
    const allObjects = [...data.sceneObjects, ...Object.values(data.blueprints)];
    allObjects.forEach(obj => {
        if (obj.asset) {
            assetPaths.push(obj.asset);
        } else if (obj.animationFromFrames) {
            const { basePath, frameCount, padLength, extension } = obj.animationFromFrames;
            for (let i = 0; i < frameCount; i++) {
                const frameNumber = String(i).padStart(padLength, '0');
                assetPaths.push(`${basePath}${frameNumber}${extension}`);
            }
        }
    });
    return [...new Set(assetPaths)];
}

function createSprite(data) {
    let sprite;
    if (data.asset) {
        const assetData = textures[data.asset];
        if (assetData.animations) {
            const animName = data.behaviors?.find(b=>b.type==='animation')?.animationName || Object.keys(assetData.animations)[0];
            sprite = new PIXI.AnimatedSprite(assetData.animations[animName]);
        } else {
            sprite = new PIXI.Sprite(assetData);
        }
    } else if (data.animationFromFrames) {
        const { basePath, frameCount, padLength, extension } = data.animationFromFrames;
        const frameTextures = [];
        for (let i = 0; i < frameCount; i++) {
            const frameNumber = String(i).padStart(padLength, '0');
            const texturePath = `${basePath}${frameNumber}${extension}`;
            frameTextures.push(textures[texturePath]);
        }
        sprite = new PIXI.AnimatedSprite(frameTextures);
    }
    sprite.x = data.position.x;
    sprite.y = data.position.y;
    sprite.anchor.set(data.anchor.x, data.anchor.y);
    sprite.scale.x = data.scale?.x || 1;
    sprite.scale.y = data.scale?.y || 1;
    sprite.rotation = (data.rotation || 0) * (Math.PI / 180);
    sprite.collision = data.collision;
    return sprite;
}

function checkCollision(spriteA, spriteB) {
    const boundsA = spriteA.getBounds();
    const boundsB = spriteB.getBounds();
    return boundsA.x < boundsB.x + boundsB.width &&
           boundsA.x + boundsA.width > boundsB.x &&
           boundsA.y < boundsB.y + boundsB.height &&
           boundsA.y + boundsA.height > boundsB.y;
}

let nextObjectId = 0;
function createGameObject(blueprintId, position) {
    const blueprint = worldData.blueprints[blueprintId];
    if (!blueprint) return;
    const id = `${blueprintId}_${nextObjectId++}`;
    const sprite = createSprite({ ...blueprint, position });
    app.stage.addChild(sprite);
    sprite.id = id;
    sprite.behaviors = [];
    if (blueprint.behaviors) {
        blueprint.behaviors.forEach(behaviorData => {
            const BehaviorClass = BEHAVIOR_MAP[behaviorData.type];
            if (BehaviorClass) {
                sprite.behaviors.push(new BehaviorClass(sprite, behaviorData));
            }
        });
    }
    gameObjects.set(id, sprite);
}

function destroyGameObject(id) {
    const sprite = gameObjects.get(id);
    if (sprite) {
        app.stage.removeChild(sprite);
        sprite.destroy(); // Liberta a memória do sprite
        gameObjects.delete(id);
    }
}

// --- Função Principal ---
async function main() {
    // --- LÓGICA DE CARREGAMENTO INTELIGENTE ---
    // Tenta obter os dados de pré-visualização da "caixa de correio".
    const previewDataString = sessionStorage.getItem('levelDataForPreview');

    if (previewDataString) {
        console.log("A carregar nível a partir da pré-visualização do editor!");
        // Se encontrou dados de pré-visualização, usa-os.
        worldData = JSON.parse(previewDataString);
        // Limpa a caixa de correio para que um recarregamento normal da página do jogo
        // não use os dados de pré-visualização novamente.
        sessionStorage.removeItem('levelDataForPreview');
    } else {
        console.log("A carregar nível a partir do ficheiro level1.json.");
        // Se não encontrou nada, carrega do ficheiro, como fazia antes.
        const response = await fetch(`level1.json?v=${Date.now()}`);
        worldData = await response.json();
    }
    
    // --- O RESTO DA INICIALIZAÇÃO CONTINUA EXATAMENTE IGUAL ---
    app = new PIXI.Application({
        width: worldData.settings.width,
        height: worldData.settings.height,
        backgroundColor: worldData.settings.backgroundColor,
    });
    document.body.appendChild(app.view);

    const uiContainer = document.getElementById('ui-container');
    if (worldData.ui) {
        uiManager = new UIManager(uiContainer, worldData.ui);
        uiManager.render();
    }

    const allAssetsToLoad = getAllAssetPaths(worldData);
    const loadedTextures = await PIXI.Assets.load(allAssetsToLoad);
    allAssetsToLoad.forEach(path => { textures[path] = loadedTextures[path]; });

    worldData.sceneObjects.forEach(objData => {
        const sprite = createSprite(objData);
        app.stage.addChild(sprite);
        sprite.id = objData.id;
        sprite.behaviors = [];
        if (objData.behaviors) {
            objData.behaviors.forEach(behaviorData => {
                const BehaviorClass = BEHAVIOR_MAP[behaviorData.type];
                if (BehaviorClass) {
                    sprite.behaviors.push(new BehaviorClass(sprite, behaviorData));
                }
            });
        }
        gameObjects.set(objData.id, sprite);
    });

    app.ticker.add(gameLoop);
}

// --- Game Loop Principal (Versão Completa de 4 Fases) ---
function gameLoop(ticker) {
    // FASE 1: ATUALIZAR COMPORTAMENTOS
    gameObjects.forEach(sprite => {
        if (sprite.behaviors) {
            sprite.behaviors.forEach(behavior => {
                behavior.update(ticker);
            });
        }
    });

    // FASE 2: DETEÇÃO DE COLISÃO
    const objectList = Array.from(gameObjects.values());
    for (let i = 0; i < objectList.length; i++) {
        const spriteA = objectList[i];
        if (!spriteA.collision || !spriteA.collision.hits || spriteA.isMarkedForDeletion) continue;
        for (let j = 0; j < objectList.length; j++) {
            if (i === j) continue;
            const spriteB = objectList[j];
            if (!spriteB.collision || spriteB.isMarkedForDeletion) continue;
            if (spriteA.collision.hits.includes(spriteB.collision.tag)) {
                if (checkCollision(spriteA, spriteB)) {
                    if (spriteA.collision.onDestroy) createGameObject(spriteA.collision.onDestroy.create, { x: spriteA.x, y: spriteA.y });
                    if (spriteB.collision.onDestroy) {
                         createGameObject(spriteB.collision.onDestroy.create, { x: spriteB.x, y: spriteB.y });
                         gameState.score += 10;
                    }
                    spriteA.isMarkedForDeletion = true;
                    spriteB.isMarkedForDeletion = true;
                    break; 
                }
            }
        }
    }

    // FASE 3: LIMPEZA
    gameObjects.forEach(sprite => {
        if (sprite.isMarkedForDeletion) {
            destroyGameObject(sprite.id);
        }
    });
    
    // FASE 4: ATUALIZAR UI
    if (uiManager) {
        uiManager.update(gameState);
    }
}

// Inicia o motor!
main();