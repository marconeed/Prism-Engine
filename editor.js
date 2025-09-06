window.addEventListener('DOMContentLoaded', () => {
    
    // --- Variáveis Globais ---
    let worldData = null;
    let pixiApp;
    let uiManager;
    let selectedObject = null;
    const gameObjects = new Map();
    const commandManager = new CommandManager();

    // Estados de arrasto
    let draggingObject = null;
    let draggingHandle = null;
    let draggingRotation = false;
    let dragStartData = {};
    let currentFileName = 'level1.json'

    const selectionBox = new PIXI.Graphics();
    const scaleHandles = {
        topLeft: new PIXI.Graphics(), topRight: new PIXI.Graphics(),
        bottomLeft: new PIXI.Graphics(), bottomRight: new PIXI.Graphics(),
    };
    const rotationHandle = new PIXI.Graphics();
    let nextObjectId = 0;

    // --- Elementos da UI ---
    const propertyInspector = document.getElementById('propertyInspector');
    const assetPanel = document.getElementById('assetPanel');
    const hierarchyList = document.getElementById('hierarchyList');
    const uiHierarchyList = document.getElementById('uiHierarchyList');
    const saveButton = document.getElementById('saveButton');
    
    // --- Contexto do Editor para Comandos ---
    const editorContext = {
        worldData: () => worldData,
        pixiApp: () => pixiApp,
        gameObjects: () => gameObjects,
        selectObject,
        addNewObjectToScene,
        deleteObjectById,
        recreateObject,
        updateAllUI,
        createSprite,
    };
    
    async function init() {
        console.log("[init] A iniciar o editor...");
        try {
            const response = await fetch(`level1.json?v=${Date.now()}`);
            worldData = await response.json();
            console.log("[init] worldData carregado:", JSON.parse(JSON.stringify(worldData)));

            pixiApp = new PIXI.Application({
                width: worldData.settings.width,
                height: worldData.settings.height,
                backgroundColor: worldData.settings.backgroundColor,
                view: document.getElementById('sceneCanvas')
            });

            const uiContainer = document.getElementById('editor-ui-container');
            if (worldData.ui) {
                uiManager = new UIManager(uiContainer, worldData.ui);
                uiManager.render();
            }

            const assetPaths = getAllAssetPaths(worldData);
            await PIXI.Assets.load(assetPaths);

            worldData.sceneObjects.forEach(obj => {
                const num = parseInt(obj.id.split('_').pop());
                if (!isNaN(num) && num >= nextObjectId) nextObjectId = num + 1;
            });

            renderScene();
            populateAssetPanel();
            addUIEventListeners();
            updateAllUI();
            
            const stage = pixiApp.stage;
            stage.addChild(selectionBox);
            Object.values(scaleHandles).forEach(h => stage.addChild(h));
            stage.addChild(rotationHandle);
            
            stage.interactive = true;
            stage.on('pointerdown', (event) => { if (event.target === stage) selectObject(null); });
            stage.on('pointermove', onDragMove);
            stage.on('pointerup', onDragEnd);
            stage.on('pointerupoutside', onDragEnd);

            const canvas = pixiApp.view;
            canvas.addEventListener('dragover', (event) => event.preventDefault());
            canvas.addEventListener('drop', onCanvasDrop);

            window.addEventListener('keydown', onKeyDown);
            propertyInspector.addEventListener('input', onPropertyChange);

            const playButton = document.getElementById('playButton'); // Pega a referência

            // Liga o listener para pré-visualização em tempo real
            playButton.addEventListener('click', () => {
                if (!worldData) {
                    alert('Dados não carregados. Não é possível pré-visualizar.');
                    return;
                }

                console.log("A preparar pré-visualização...");
                
                // 1. Converte o estado atual do worldData para uma string JSON.
                const jsonString = JSON.stringify(worldData);
                
                // 2. Guarda essa string na "caixa de correio" (sessionStorage).
                sessionStorage.setItem('levelDataForPreview', jsonString);
                
                // 3. Abre o jogo numa nova aba.
                window.open('index2.html', '_blank');
            });

            const openButton = document.getElementById('openButton');
            const fileInput = document.getElementById('fileInput');

            openButton.addEventListener('click', () => fileInput.click());

            fileInput.addEventListener('change', loadFile);

            saveButton.addEventListener('click', saveData);
            playButton.addEventListener('click', previewGame);

        } catch (error) {
            console.error('Erro ao inicializar o editor:', error);
            alert('Falha ao inicializar o editor.');
        }
    }

    // --- Funções de Atualização da UI ---

    function updateAllUI() {
        updateHierarchyPanel();
        updateUIHierarchyPanel();
        populatePropertyInspector();
        updateSelectionBox();
    }

        /**
     * Limpa e redesenha a lista de OBJETOS DE JOGO (SPRITES) no painel de Hierarquia da Cena.
     * Esta versão inclui um log para depurar a fonte dos dados.
     */
    function updateHierarchyPanel() {
        if (!hierarchyList) return;
        hierarchyList.innerHTML = '';
        if (worldData && worldData.sceneObjects) {
            worldData.sceneObjects.forEach(objData => {
                const item = document.createElement('div');
                item.className = 'hierarchy-item';
                item.innerText = objData.id;
                if (selectedObject && selectedObject.dataSource && selectedObject.dataSource.id === objData.id) {
                    item.classList.add('selected');
                }
                item.addEventListener('click', () => { selectObjectById(objData.id, false); });
                hierarchyList.appendChild(item);
            });
        }
    }

    /**
     * NOVO: Preenche o painel de assets com os blueprints do worldData.
     */
    function populateAssetPanel() {
        for (const blueprintId in worldData.blueprints) {
            const item = document.createElement('div');
            item.className = 'asset-item';
            item.draggable = true;
            item.innerText = blueprintId;
            item.addEventListener('dragstart', (event) => {
                event.dataTransfer.setData('text/plain', blueprintId);
            });
            assetPanel.appendChild(item);
        }
    }

    // ficheiro: editor.js

    function updateUIHierarchyPanel() {
        if (!uiHierarchyList) return;
        uiHierarchyList.innerHTML = '';
        if (worldData && worldData.ui) {
            for (const key in worldData.ui) {
                const item = document.createElement('div');
                item.className = 'hierarchy-item';
                item.innerText = key;
                if (selectedObject && !selectedObject.dataSource && selectedObject.id === key) {
                    item.classList.add('selected');
                }
                item.addEventListener('click', () => { selectObjectById(key, true); });
                uiHierarchyList.appendChild(item);
            }
        }
    }

        /**
     * Chamado quando o utilizador quer apagar o objeto selecionado.
     * Cria um 'DeleteObjectCommand' para que a ação possa ser desfeita.
     */
    function deleteSelectedObject() {
        if (!selectedObject || !selectedObject.dataSource) return;
        const command = new DeleteObjectCommand(editorContext, selectedObject);
        commandManager.execute(command);
    }

        /**
     * Chamado quando um asset do painel é solto no canvas do editor.
     * Cria um 'CreateObjectCommand' para que a ação possa ser desfeita.
     * @param {DragEvent} event - O evento de 'drop'.
     */
    function onCanvasDrop(event) {
        // 1. Impede o comportamento padrão do navegador (que seria tentar abrir o "ficheiro" arrastado).
        event.preventDefault();

        // 2. Obtém o ID do blueprint que foi guardado durante o 'dragstart'.
        const blueprintId = event.dataTransfer.getData('text/plain');
        if (!worldData.blueprints[blueprintId]) {
            console.error(`Blueprint com ID "${blueprintId}" não encontrado.`);
            return;
        }

        // 3. Calcula a posição do 'drop' dentro do canvas.
        // As coordenadas do evento (clientX, clientY) são relativas à janela do navegador,
        // então subtraímos a posição do canvas para obter as coordenadas locais.
        const canvasBounds = pixiApp.view.getBoundingClientRect();
        const position = {
            x: event.clientX - canvasBounds.left,
            y: event.clientY - canvasBounds.top
        };

        // 4. Cria o comando de criação.
        // Passamos o 'editorContext' para que o comando tenha acesso às funções do editor de que precisa.
        const command = new CreateObjectCommand(editorContext, blueprintId, position);

        // 5. Executa o comando através do gestor.
        // Isto irá chamar o método .execute() do comando e adicioná-lo à pilha de Desfazer.
        commandManager.execute(command);
    }

    function onKeyDown(event) {
        if (event.ctrlKey && event.code === 'KeyZ') {
            event.preventDefault(); commandManager.undo(); updateAllUI();
        } else if (event.ctrlKey && event.code === 'KeyY') {
            event.preventDefault(); commandManager.redo(); updateAllUI();
        } else if (event.code === 'Delete') {
            event.preventDefault(); deleteSelectedObject();
        }
    }

        /**
     * Cria um novo objeto com base num blueprint, adiciona-o aos dados da cena (worldData)
     * e renderiza-o no viewport do editor.
     * @param {string} blueprintId - O ID do blueprint (ex: "enemy") a ser usado.
     * @param {{x: number, y: number}} position - A posição inicial para o novo objeto.
     * @returns {object} Os dados do objeto recém-criado que foi adicionado ao worldData.
     */
    function addNewObjectToScene(blueprintId, position) {
        const blueprint = worldData.blueprints[blueprintId];
        if (!blueprint) {
            console.error(`Blueprint "${blueprintId}" não encontrado ao tentar criar objeto.`);
            return null;
        }

        // 1. CRIA OS DADOS DO NOVO OBJETO
        // Faz uma cópia profunda (deep copy) do blueprint para não alterar o original.
        const newObjectData = JSON.parse(JSON.stringify(blueprint));
        
        // Atribui um ID único e a posição fornecida.
        newObjectData.id = `${blueprintId}_${nextObjectId++}`;
        newObjectData.position = position;

        // Garante que as propriedades de transformação essenciais existam.
        newObjectData.scale = blueprint.scale || { x: 1, y: 1 };
        newObjectData.rotation = blueprint.rotation || 0;

        // Adiciona o novo objeto à lista de objetos da cena nos nossos dados principais.
        worldData.sceneObjects.push(newObjectData);

        // 2. CRIA O SPRITE VISUAL
        const sprite = createSprite(newObjectData);
        sprite.dataSource = newObjectData; // Liga o sprite aos seus dados
        sprite.interactive = true;
        sprite.on('pointerdown', onDragStart); // Torna-o arrastável

        // Adiciona o sprite ao palco do PixiJS para que seja visível.
        pixiApp.stage.addChild(sprite);
        
        // Adiciona o sprite ao nosso mapa de acesso rápido.
        gameObjects.set(newObjectData.id, sprite);

        // 3. ATUALIZA A UI
        // Seleciona o objeto recém-criado para feedback imediato.
        selectObject(sprite);

        // 4. RETORNA OS DADOS
        // Isto é crucial para o sistema de Desfazer/Refazer.
        return newObjectData;
    }

        /**
     * Encontra um objeto pelo seu ID e remove-o completamente do editor,
     * tanto da cena visual como dos dados do nível.
     * @param {string} id - O ID único do objeto a ser apagado.
     */
    function deleteObjectById(id) {
        // 1. Encontra o sprite visual no nosso mapa de objetos.
        const sprite = gameObjects.get(id);

        // Se não encontrar o sprite, não há nada a fazer.
        if (!sprite) {
            console.warn(`Tentativa de apagar um objeto com ID "${id}" que não foi encontrado na cena.`);
            return;
        }

        // 2. Remove o sprite do palco do PixiJS para que deixe de ser visível.
        pixiApp.stage.removeChild(sprite);

        // 3. Remove o sprite do nosso mapa de acesso rápido.
        gameObjects.delete(id);

        // 4. Remove os dados do objeto do nosso array de dados principal.
        // O método .filter() cria um novo array contendo todos os objetos, exceto aquele com o ID correspondente.
        worldData.sceneObjects = worldData.sceneObjects.filter(obj => obj.id !== id);

        // 5. Se o objeto apagado era o que estava selecionado, limpa a seleção.
        if (selectedObject && selectedObject.dataSource.id === id) {
            selectObject(null); // A função selectObject já atualiza toda a UI.
        } else {
            // Se outro objeto estava selecionado, a hierarquia ainda assim mudou, então atualizamos.
            updateHierarchyPanel();
        }
    }

        /**
     * Recria um objeto que foi previamente apagado. Usado pelo sistema de Undo.
     * @param {object} data - Os dados completos do objeto a ser recriado.
     * @param {number} index - O índice original onde o objeto deve ser reinserido na lista.
     */
    function recreateObject(data, index) {
        // Verificação de segurança para evitar duplicados caso algo corra mal.
        if (gameObjects.has(data.id)) {
            console.warn(`Tentativa de recriar um objeto com ID "${data.id}" que já existe.`);
            return;
        }

        // 1. REINSERE OS DADOS NO worldData
        // O método splice() insere o 'data' no array 'sceneObjects' na posição 'index'.
        worldData.sceneObjects.splice(index, 0, data);

        // 2. RECRIA O SPRITE VISUAL
        // Usamos a nossa função central para criar o sprite a partir dos dados.
        const sprite = createSprite(data);
        sprite.dataSource = data;
        sprite.interactive = true;
        sprite.on('pointerdown', onDragStart);

        // Adiciona o sprite de volta ao palco e ao nosso mapa de objetos.
        pixiApp.stage.addChild(sprite);
        gameObjects.set(data.id, sprite);

        // 3. ATUALIZA A UI
        // Seleciona o objeto recém-restaurado e atualiza a hierarquia.
        selectObject(sprite);
        updateHierarchyPanel();
    }

    /**
     * Desenha todos os objetos da cena no canvas do editor.
     */
    function renderScene() {
        gameObjects.forEach(sprite => sprite.destroy());
        gameObjects.clear();

        worldData.sceneObjects.forEach(objData => {
            const sprite = createSprite(objData);
            sprite.dataSource = objData;
            sprite.interactive = true;
            sprite.on('pointerdown', onDragStart);
            pixiApp.stage.addChild(sprite);
            gameObjects.set(objData.id, sprite);
        });
    }

    function onRotationHandleDragStart(event) {
        event.stopPropagation();
        draggingRotation = true;
        dragStartData = { rotation: selectedObject.dataSource.rotation };
    }

    // --- NOVAS FUNÇÕES DE DRAG-AND-DROP ---

    // Modifique onDragStart para guardar a posição inicial
    function onDragStart(event) {
        event.stopPropagation();
        const sprite = event.currentTarget;
        selectObject(sprite);
        draggingObject = sprite;
        // Guarda o estado completo no início do arrasto
        dragStartData = {
            position: { x: sprite.x, y: sprite.y },
            scale: { x: sprite.scale.x, y: sprite.scale.y },
            rotation: sprite.dataSource.rotation,
        };
    }

    // NOVO: Chamado quando uma alça de escala é clicada
    function onScaleHandleDragStart(event, handleName) {
        event.stopPropagation();
        draggingHandle = handleName;
        dragStartData = { scale: { x: selectedObject.scale.x, y: selectedObject.scale.y } };
    }

        /**
     * Chamado continuamente sempre que o rato se move sobre o palco.
     * Verifica se uma operação de arrasto (mover, escalar ou rodar) está ativa e executa a lógica apropriada.
     * @param {PIXI.FederatedPointerEvent} event - O evento de movimento do rato.
     */
    function onDragMove(event) {
        
        // --- LÓGICA DE ROTAÇÃO ---
        if (draggingRotation) {
            // Obtém a posição atual do rato dentro do nosso canvas.
            const mousePos = event.data.getLocalPosition(pixiApp.stage);
            // O ponto de pivô para a rotação é o centro do objeto selecionado.
            const objectCenter = { x: selectedObject.x, y: selectedObject.y };
            
            // 1. CALCULA O ÂNGULO
            // Usamos trigonometria (arcotangente) para encontrar o ângulo entre o centro do objeto e o rato.
            const angleRad = Math.atan2(mousePos.y - objectCenter.y, mousePos.x - objectCenter.x);
            // Convertemos o resultado de radianos para graus e adicionamos 90 graus para alinhar a alça com o "topo" do objeto.
            const angleDeg = Math.round(angleRad * (180 / Math.PI)) + 90;

            // 2. ATUALIZA OS DADOS E OS VISUAIS
            // Aplica a rotação ao sprite (o PixiJS usa radianos).
            selectedObject.rotation = angleRad + (Math.PI / 2);
            // Atualiza o nosso objeto de dados (que usa graus, por ser mais fácil para humanos).
            selectedObject.dataSource.rotation = angleDeg;

            // 3. SINCRONIZA A UI
            // Atualiza o painel de propriedades e redesenha a caixa de seleção e as alças na nova orientação.
            populatePropertyInspector();
            updateSelectionBox();
        } 
        // --- LÓGICA DE ESCALA ---
        else if (draggingHandle) {
            const newPos = event.data.getLocalPosition(pixiApp.stage);
            const bounds = selectedObject.getBounds();
            let newWidth = selectedObject.width;
            let newHeight = selectedObject.height;

            // 1. CALCULA AS NOVAS DIMENSÕES
            // Com base em qual alça está a ser arrastada, calcula a nova largura/altura.
            if (draggingHandle.includes('Right')) {
                newWidth = newPos.x - bounds.x;
            } else if (draggingHandle.includes('Left')) {
                newWidth = (bounds.x + bounds.width) - newPos.x;
            }
            if (draggingHandle.includes('Bottom')) {
                newHeight = newPos.y - bounds.y;
            } else if (draggingHandle.includes('Top')) {
                newHeight = (bounds.y + bounds.height) - newPos.y;
            }
            
            // 2. ATUALIZA OS DADOS E OS VISUAIS
            // Impede que a escala seja invertida ou zero, o que poderia causar problemas.
            selectedObject.width = Math.max(1, newWidth);
            selectedObject.height = Math.max(1, newHeight);
            // Atualiza os nossos dados com o novo fator de escala calculado pelo PixiJS.
            selectedObject.dataSource.scale.x = selectedObject.scale.x;
            selectedObject.dataSource.scale.y = selectedObject.scale.y;

            // 3. SINCRONIZA A UI
            populatePropertyInspector();
            updateSelectionBox();
        } 
        // --- LÓGICA DE MOVIMENTO ---
        else if (draggingObject) {
            const newPosition = event.data.getLocalPosition(pixiApp.stage);
            
            // 1. ATUALIZA OS DADOS E OS VISUAIS
            // Arredonda os valores para evitar casas decimais longas.
            draggingObject.x = Math.round(newPosition.x);
            draggingObject.y = Math.round(newPosition.y);
            // Atualiza os nossos dados para refletir a nova posição.
            draggingObject.dataSource.position.x = draggingObject.x;
            draggingObject.dataSource.position.y = draggingObject.y;

            // 2. SINCRONIZA A UI
            // Atualiza diretamente os campos de input do painel para feedback instantâneo.
            document.getElementById('objX').value = draggingObject.x;
            document.getElementById('objY').value = draggingObject.y;
            // Redesenha a caixa de seleção para seguir o objeto.
            updateSelectionBox();
        }
    }

    function onDragEnd() {
        if (draggingObject) {
            const newPos = { x: draggingObject.x, y: draggingObject.y };
            if (newPos.x !== dragStartData.position.x || newPos.y !== dragStartData.position.y) {
                const command = new MoveCommand(draggingObject, dragStartData.position, newPos);
                commandManager.execute(command);
            }
        }
        if (draggingHandle) {
            const newScale = { x: selectedObject.scale.x, y: selectedObject.scale.y };
            if (newScale.x !== dragStartData.scale.x || newScale.y !== dragStartData.scale.y) {
                const command = new ScaleCommand(selectedObject, dragStartData.scale, newScale);
                commandManager.execute(command);
            }
        }
        if (draggingRotation) {
            const newRotation = selectedObject.dataSource.rotation;
            if (newRotation !== dragStartData.rotation) {
                const command = new RotateCommand(selectedObject, dragStartData.rotation, newRotation);
                commandManager.execute(command);
            }
        }

        draggingObject = null;
        draggingHandle = null;
        draggingRotation = false;
    }

    // --- Funções do Editor (com pequenas modificações) ---

        /**
     * ATUALIZADO: A função de seleção agora só chama updateSelectionBox
     * se o objeto selecionado for um sprite visual.
     * @param {PIXI.Sprite | object | null} object - O sprite ou o objeto de dados da UI a selecionar.
     */
    function selectObject(object) {
        console.log("[selectObject] Objeto selecionado:", object);
        selectedObject = object;

        // --- A CORREÇÃO ESTÁ AQUI ---
        // Apenas chamamos updateSelectionBox se o objeto for um sprite do PixiJS
        // (que tem a propriedade 'dataSource').
        if (selectedObject && selectedObject.dataSource) {
            updateSelectionBox();
        } else {
            selectionBox.clear(); // Se for um elemento de UI, apenas limpa a caixa.
        }
        
        populatePropertyInspector();
        updateHierarchyPanel();
        updateUIHierarchyPanel();
    }

    /**
 * Encontra um objeto ou elemento de UI pelo seu ID e o seleciona.
 * Atua como um router que chama a função de seleção principal (selectObject).
 * @param {string} id - O ID do objeto a ser selecionado (ex: "player" ou "scoreLabel").
 * @param {boolean} [isUiElement=false] - Uma flag que indica se o ID pertence a um elemento de UI.
 */
function selectObjectById(id, isUiElement = false) {
    // A lógica é dividida com base na flag 'isUiElement'.
    
    if (isUiElement) {
        // --- CAMINHO PARA SELECIONAR UM ELEMENTO DE UI ---
        
        // 1. Procura os dados do elemento de UI no nosso worldData, usando o 'id' como a chave.
        const uiData = worldData.ui[id];

        // 2. Se encontrar, chama a função de seleção principal.
        if (uiData) {
            // A CORREÇÃO CRUCIAL:
            // Criamos um novo objeto para ser o 'selectedObject'. A sua propriedade 'id'
            // será a CHAVE do objeto (ex: "scoreLabel"), garantindo consistência.
            selectObject({ id: id, ...uiData });
        }
    } else {
        // --- CAMINHO PARA SELECIONAR UM OBJETO DE JOGO ---

        // 1. Procura o sprite visual no nosso mapa de objetos do jogo (gameObjects).
        const spriteToSelect = gameObjects.get(id);

        // 2. Se encontrar, chama a função de seleção principal com o sprite.
        if (spriteToSelect) {
            selectObject(spriteToSelect);
        }
    }
}

    /**
     * Desenha uma caixa à volta do objeto selecionado.
     */
    /**
 * Desenha a caixa de seleção, as alças de escala e a alça de rotação
 * à volta do objeto atualmente selecionado.
 */
function updateSelectionBox() {
    // 1. Limpa todos os gráficos antigos para evitar "fantasmas" na tela.
    selectionBox.clear();
    Object.values(scaleHandles).forEach(h => h.clear().interactive = false);
    rotationHandle.clear().interactive = false;

    // 2. Se nada estiver selecionado, a função termina aqui.
    if (!selectedObject) {
        return;
    }

    // 3. Obtém os limites (bounding box) do objeto selecionado.
    const bounds = selectedObject.getBounds();
    
    // 4. Desenha a caixa de seleção principal (o retângulo verde).
    selectionBox.lineStyle(1, 0x00FF00, 1); // Linha verde de 1px
    selectionBox.drawRect(bounds.x, bounds.y, bounds.width, bounds.height);

    // 5. Define e desenha os GIZMOS DE ESCALA (pequenos quadrados nos cantos).
    const handleSize = 8;
    const handlePositions = {
        topLeft: { x: bounds.x, y: bounds.y },
        topRight: { x: bounds.x + bounds.width, y: bounds.y },
        bottomLeft: { x: bounds.x, y: bounds.y + bounds.height },
        bottomRight: { x: bounds.x + bounds.width, y: bounds.y + bounds.height }
    };
    
    // Itera sobre cada posição de alça para desenhá-la e torná-la interativa.
    for (const [name, pos] of Object.entries(handlePositions)) {
        const handle = scaleHandles[name];
        handle.clear();
        handle.beginFill(0x00FF00); // Preenchimento verde
        // Desenha o quadrado centrado na sua posição para facilitar o clique.
        handle.drawRect(-handleSize / 2, -handleSize / 2, handleSize, handleSize);
        handle.endFill();
        handle.position.set(pos.x, pos.y);
        handle.interactive = true;
        handle.cursor = 'pointer';

        // Remove listeners antigos para evitar duplicação de eventos.
        handle.removeAllListeners(); 
        // Adiciona o listener para o início do arrasto da alça de escala.
        handle.on('pointerdown', (e) => onScaleHandleDragStart(e, name));
    }

    // 6. Define e desenha o GIZMO DE ROTAÇÃO (linha e círculo).
    const rotationHandleLength = 30; // Comprimento da linha da alça

    // Calcula a posição da ponta da alça com base na posição e rotação do objeto.
    // Usamos trigonometria (seno e cosseno) para isso.
    const handleX = selectedObject.x - rotationHandleLength * Math.sin(selectedObject.rotation);
    const handleY = selectedObject.y - rotationHandleLength * Math.cos(selectedObject.rotation);

    // Desenha a linha que liga o centro do objeto à alça de rotação.
    // Esta linha faz parte da `selectionBox` principal.
    selectionBox.lineStyle(1, 0x00FF00, 1)
                .moveTo(selectedObject.x, selectedObject.y)
                .lineTo(handleX, handleY);

    // Desenha o círculo da alça de rotação.
    const rotHandleSize = 5;
    rotationHandle.clear();
    rotationHandle.beginFill(0x00FF00);
    rotationHandle.drawCircle(0, 0, rotHandleSize);
    rotationHandle.endFill();
    rotationHandle.position.set(handleX, handleY);
    rotationHandle.interactive = true;
    rotationHandle.cursor = 'pointer';
    rotationHandle.removeAllListeners();
    rotationHandle.on('pointerdown', onRotationHandleDragStart);
}

/**
 * Preenche o painel de propriedades com os dados do objeto selecionado.
 * Esta função é "inteligente" e mostra campos diferentes para Objetos de Jogo vs. Elementos de UI.
 */
function populatePropertyInspector() {
    const inspectorDiv = document.getElementById('propertyInspector');
    if (!inspectorDiv) return;

    // Se nada estiver selecionado, limpa o painel e mostra uma mensagem.
    if (!selectedObject) {
        inspectorDiv.innerHTML = '<h2>Nenhum objeto selecionado</h2>';
        return;
    }

    // --- CASO 1: OBJETO DE JOGO (SPRITE) ESTÁ SELECIONADO ---
    // A verificação `selectedObject.dataSource` confirma que é um sprite do nosso jogo.
    if (selectedObject.dataSource) {
        const data = selectedObject.dataSource;
        let html = `
            <h2>Propriedades do Objeto</h2>
            <div class="property">
                <label>ID:</label>
                <input type="text" value="${data.id}" disabled>
            </div>
            <div class="property">
                <label>Posição X:</label>
                <input type="number" value="${data.position.x}" data-property-path="position.x">
            </div>
            <div class="property">
                <label>Posição Y:</label>
                <input type="number" value="${data.position.y}" data-property-path="position.y">
            </div>
            <div class="property">
                <label>Escala X:</label>
                <input type="number" step="0.01" value="${(data.scale ? data.scale.x : 1).toFixed(2)}" data-property-path="scale.x">
            </div>
            <div class="property">
                <label>Escala Y:</label>
                <input type="number" step="0.01" value="${(data.scale ? data.scale.y : 1).toFixed(2)}" data-property-path="scale.y">
            </div>
            <div class="property">
                <label>Rotação:</label>
                <input type="number" value="${Math.round(data.rotation || 0)}" data-property-path="rotation">
            </div>
            <div id="behaviorProperties"></div>
        `;
        inspectorDiv.innerHTML = html;

        const behaviorDiv = document.getElementById('behaviorProperties');
        let behaviorHtml = '';
        if (data.behaviors) {
            data.behaviors.forEach((b, index) => {
                behaviorHtml += `<h3>Behavior: ${b.type}</h3>`;
                for (const key in b) {
                    if (key !== 'type') {
                        behaviorHtml += `
                            <div class="property">
                                <label>${key}:</label>
                                <input type="text" value="${b[key]}" data-behavior-index="${index}" data-property-key="${key}">
                            </div>
                        `;
                    }
                }
            });
        }
        behaviorDiv.innerHTML = behaviorHtml;

    } 
    // --- CASO 2: ELEMENTO DE UI ESTÁ SELECIONADO ---
    else {
        const data = selectedObject; // Neste caso, o objeto selecionado SÃO os dados.
        let html = `
            <h2>Propriedades da UI</h2>
            <div class="property">
                <label>ID:</label>
                <input type="text" value="${data.id}" disabled>
            </div>
            <div class="property">
                <label>Tipo:</label>
                <input type="text" value="${data.type}" disabled>
            </div>
            <div class="property">
                <label>Texto:</label>
                <input type="text" value='${data.text}' 
                       data-ui-id="${data.id}" data-ui-property="text">
            </div>
            <h3>Estilos (CSS)</h3>
        `;
        
        let styleHtml = '';
        if (data.style) {
            for (const styleKey in data.style) {
                styleHtml += `
                    <div class="property">
                        <label>${styleKey}:</label>
                        <input type="text" value="${data.style[styleKey]}"
                               data-ui-id="${data.id}" data-ui-property="style" data-style-key="${styleKey}">
                    </div>
                `;
            }
        }
        
        inspectorDiv.innerHTML = html + styleHtml;
    }
}

        /**
     * Pega no objeto worldData (que já está sempre atualizado em tempo real)
     * e inicia o processo de download do ficheiro JSON.
     */
    function saveData() {
        if (!worldData) {
            alert('Dados não carregados. Não é possível salvar.');
            return;
        }

        console.log(`A salvar os dados para o ficheiro: ${currentFileName}`);

        // --- A LINHA IMPORTANTE ---
        // Em vez de um nome fixo, usamos a variável que guarda o nome atual.
        downloadJSON(worldData, currentFileName);
        // --- FIM DA ALTERAÇÃO ---
    }

            /**
         * Chamado quando o utilizador seleciona um ficheiro no input.
         * Usa o FileReader para ler o conteúdo do ficheiro.
         * @param {Event} event - O evento 'change' do input.
         */
        function loadFile(event) {
            const file = event.target.files[0];
            if (!file) return;

            // --- A LINHA IMPORTANTE ---
            currentFileName = file.name; // Guarda o nome do ficheiro que acabámos de abrir
            console.log(`A carregar o ficheiro: ${currentFileName}`);
            // --- FIM DA ALTERAÇÃO ---

            const reader = new FileReader();
            
            reader.onload = (e) => {
                const text = e.target.result;
                try {
                    const newData = JSON.parse(text);
                    loadState(newData);
                } catch (error) {
                    console.error("Erro ao processar o ficheiro JSON:", error);
                    alert("O ficheiro selecionado não é um JSON válido.");
                }
            };

            reader.readAsText(file);
            event.target.value = null;
        }

        /**
         * Reinicia completamente o estado do editor com os novos dados carregados.
         * @param {object} newData - O novo objeto worldData carregado do ficheiro.
         */
        function loadState(newData) {
            console.log("A carregar novo estado no editor...");

            // 1. Substitui os dados antigos pelos novos
            worldData = newData;

            // 2. Limpa o histórico de Undo/Redo
            commandManager.reset();

            // 3. Recalcula o próximo ID de objeto disponível
            nextObjectId = 0;
            worldData.sceneObjects.forEach(obj => {
                const num = parseInt(obj.id.split('_').pop());
                if (!isNaN(num) && num >= nextObjectId) {
                    nextObjectId = num + 1;
                }
            });

            // 4. Redesenha tudo
            renderScene();
            uiManager.render();
            addUIEventListeners();
            updateAllUI(); // Esta função já atualiza todas as hierarquias e o inspetor
        }

            /**
     * Guarda o estado atual do nível no sessionStorage e abre a cena do jogo numa nova aba.
     */
    function previewGame() {
        if (!worldData) {
            alert('Dados não carregados. Não é possível pré-visualizar.');
            return;
        }

        console.log("A preparar pré-visualização...");
        
        // 1. Converte o estado atual do worldData para uma string JSON.
        const jsonString = JSON.stringify(worldData);
        
        // 2. Guarda essa string no armazenamento da sessão.
        sessionStorage.setItem('levelDataForPreview', jsonString);
        
        // 3. Abre o jogo numa nova aba.
        window.open('index.html', '_blank');
    }

        /**
     * NOVO: Adiciona os event listeners de clique aos elementos de UI renderizados.
     */
    function addUIEventListeners() {
        if (!uiManager) return;
        for (const key in uiManager.elements) {
            const element = uiManager.elements[key];
            element.addEventListener('click', (event) => {
                event.stopPropagation();
                selectObjectById(key, true);
            });
        }
    }

    /**
     * Cria um link de download para o objeto de dados como um ficheiro JSON.
     * @param {object} dataObject - O objeto JavaScript a ser salvo.
     * @param {string} filename - O nome do ficheiro a ser baixado.
     */
    function downloadJSON(dataObject, filename) {
        // Converte o objeto JavaScript para uma string JSON formatada
        const jsonString = JSON.stringify(dataObject, null, 4);
        
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /**
     * Reúne todos os caminhos de assets do ficheiro de nível.
     */
    /**
     * Reúne todos os caminhos de assets do ficheiro de nível,
     * incluindo assets de sceneObjects, blueprints, e sequências de frames.
     */
    function getAllAssetPaths(data) {
        let assetPaths = [];
        // Junta os objetos da cena e os blueprints numa única lista para verificação
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
        return [...new Set(assetPaths)]; // Retorna caminhos únicos
    }

    /**
 * NOVO E CENTRALIZADO: Cria um sprite (normal ou animado) com base nos dados do blueprint.
 * Esta função agora existe no editor, tal como no motor do jogo.
 */
function createSprite(data) {
    let sprite;
    
    if (data.asset) { // Lógica para assets únicos ou spritesheets .json
        const assetData = PIXI.Assets.get(data.asset);
        if (assetData.animations) {
            const animationName = data.behaviors?.find(b => b.type === 'animation')?.animationName || Object.keys(assetData.animations)[0];
            sprite = new PIXI.AnimatedSprite(assetData.animations[animationName]);
        } else {
            sprite = new PIXI.Sprite(assetData);
        }
    } else if (data.animationFromFrames) { // Lógica para frames sequenciais
        const { basePath, frameCount, padLength, extension } = data.animationFromFrames;
        const frameTextures = [];
        for (let i = 0; i < frameCount; i++) {
            const frameNumber = String(i).padStart(padLength, '0');
            const texturePath = `${basePath}${frameNumber}${extension}`;
            frameTextures.push(PIXI.Assets.get(texturePath));
        }
        sprite = new PIXI.AnimatedSprite(frameTextures);
    }

        sprite.x = data.position.x;
        sprite.y = data.position.y;
        sprite.anchor.set(data.anchor.x, data.anchor.y);
        sprite.scale.x = data.scale?.x || 1;
        sprite.scale.y = data.scale?.y || 1;
        sprite.rotation = (data.rotation || 0) * (Math.PI / 180);

        return sprite;
    }

    function updateAllUI() {
        if(selectedObject && !selectedObject._destroyed) {
            populatePropertyInspector();
            updateSelectionBox();
        } else {
            selectObject(null);
        }
        updateHierarchyPanel();
    }
    
/**
 * Chamado sempre que um valor de input é alterado no painel.
 * ESTA É A VERSÃO CORRIGIDA E FINAL.
 */
function onPropertyChange(event) {
    console.log("[onPropertyChange] Evento de input detetado.");
        if (!selectedObject) {
            console.log("[onPropertyChange] Nada selecionado, a sair.");
            return;
        }
        const input = event.target;
        const value = isNaN(parseFloat(input.value)) ? input.value : String(input.value);
        const uiId = input.dataset.uiId;

        if (uiId) {
            console.log(`[onPropertyChange] A processar alteração para o elemento de UI com ID: ${uiId}`);
            const uiProperty = input.dataset.uiProperty;
            const styleKey = input.dataset.styleKey;
            const uiData = worldData.ui[uiId];
            if (!uiData) {
                console.error(`[onPropertyChange] Não foi possível encontrar os dados para a UI com ID: ${uiId}`);
                return;
            }

        console.log(`[onPropertyChange] Estado de worldData.ui.${uiId} ANTES da alteração:`, JSON.parse(JSON.stringify(uiData)));

            if (uiProperty === 'text') {
                console.log(`[onPropertyChange] A alterar 'text' para: "${value}"`);
                uiData.text = value;
            } else if (uiProperty === 'style' && styleKey) {
                console.log(`[onPropertyChange] A alterar 'style.${styleKey}' para: "${value}"`);
                uiData.style[styleKey] = value;
            }

            console.log(`[onPropertyChange] Estado de worldData.ui.${uiId} DEPOIS da alteração:`, JSON.parse(JSON.stringify(uiData)));
            uiManager.render();
            addUIEventListeners();
        } else {
            console.log("[onPropertyChange] A processar alteração para um Objeto de Jogo.");
            const objectId = selectedObject.dataSource.id;
            const dataObject = worldData.sceneObjects.find(obj => obj.id === objectId);
            if (!dataObject) return;

            const propertyPath = input.dataset.propertyPath;
            const behaviorIndex = input.dataset.behaviorIndex;
            const propertyKey = input.dataset.propertyKey;
            
            const numValue = parseFloat(value);

            if (propertyPath) {
                const keys = propertyPath.split('.');
                if (keys.length === 2) dataObject[keys[0]][keys[1]] = numValue;
                else dataObject[keys[0]] = numValue;
            } else if (behaviorIndex !== undefined && propertyKey) {
                const behaviorData = dataObject.behaviors[behaviorIndex];
                if (behaviorData) {
                    const originalValue = behaviorData[propertyKey];
                    behaviorData[propertyKey] = typeof originalValue === 'number' ? numValue : value;
                }
            }
            
            if (propertyPath === 'position.x') selectedObject.x = numValue;
            if (propertyPath === 'position.y') selectedObject.y = numValue;
            if (propertyPath === 'scale.x') selectedObject.scale.x = numValue;
            if (propertyPath === 'scale.y') selectedObject.scale.y = numValue;
            if (propertyPath === 'rotation') selectedObject.rotation = numValue * (Math.PI / 180);
            
            updateSelectionBox();
        }
    }
        
    // Liga o listener para edição em tempo real
    propertyInspector.addEventListener('input', onPropertyChange);

    // --- Inicialização ---
    init();
});