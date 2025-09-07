const CACHE_NAME = 'prism-engine-editor-v1';

// Lista de todos os ficheiros essenciais para a nossa aplicação funcionar offline.
const urlsToCache = [
    '/',
    'editor.html',
    'index.html',
    'level1.json',
    
    // Scripts Principais
    'editor.js',
    'game.js',
    'UIManager.js',
    'CommandManager.js',
    'MoveCommand.js',
    'ScaleCommand.js',
    'RotateCommand.js',
    'CreateObjectCommand.js',
    'DeleteObjectCommand.js',

    // Scripts de Comportamento
    'behaviors/AnimationBehavior.js',
    'behaviors/DestroyOnScreenExitBehavior.js',
    'behaviors/KeyboardMovementBehavior.js',
    'behaviors/MoveInDirectionBehavior.js',
    'behaviors/PatrolBehavior.js',
    'behaviors/ScreenBoundsBehavior.js',
    'behaviors/ShooterBehavior.js',

    // Bibliotecas Externas
    'https://cdnjs.cloudflare.com/ajax/libs/pixi.js/6.5.9/browser/pixi.min.js',
    'https://cdn.jsdelivr.net/npm/pixi-tilemap@2.1.5/dist/pixi-tilemap.umd.js',

    // Assets Visuais
    'assets/player.png',
    'assets/enemy.png',
    'assets/bullet.png',
    'assets/tileset_terreno.png',
    'assets/icons/icon-192x192.png',
    'assets/icons/icon-512x512.png'
];

// Adiciona os 20 frames da explosão à lista de cache
for (let i = 0; i < 20; i++) {
    const frameNumber = String(i).padStart(2, '0');
    urlsToCache.push(`assets/fire${frameNumber}.png`);
}

// Evento de Instalação: guarda todos os ficheiros em cache
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache aberto');
                return cache.addAll(urlsToCache);
            })
    );
});

// Evento Fetch: responde com os ficheiros do cache se disponíveis
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Se o ficheiro estiver no cache, retorna-o
                if (response) {
                    return response;
                }
                // Caso contrário, vai à rede para o obter
                return fetch(event.request);
            })
    );
});
