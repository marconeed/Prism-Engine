class UIManager {
    /**
     * @param {HTMLElement} containerElement - O div onde a UI será renderizada.
     * @param {object} uiData - Os dados da UI do ficheiro de nível.
     */
    constructor(containerElement, uiData) {
        this.container = containerElement;
        this.uiData = uiData;
        this.elements = {}; // Guarda referências aos elementos HTML criados
    }

    /**
     * Cria os elementos HTML iniciais com base nos dados.
     */
    render() {
        this.container.innerHTML = ''; // Limpa a UI antiga
        for (const key in this.uiData) {
            const data = this.uiData[key];
            if (data.type === 'text') {
                const element = document.createElement('p');
                element.id = data.id;
                element.innerText = data.text;

                for (const styleKey in data.style) {
                    element.style[styleKey] = data.style[styleKey];
                }
                
                // --- A LINHA DA CORREÇÃO ---
                // Torna este elemento específico "sólido" para eventos do rato.
                element.style.pointerEvents = 'auto';

                this.container.appendChild(element);
                this.elements[key] = element;
            }
        }
    }

    /**
     * Atualiza os elementos da UI com o estado atual do jogo.
     * @param {object} gameState - O objeto que contém o estado do jogo (ex: score).
     */
    update(gameState) {
        // Atualiza o texto da pontuação
        const scoreLabelData = this.uiData.scoreLabel;
        const scoreElement = this.elements.scoreLabel;
        if (scoreLabelData && scoreElement) {
            scoreElement.innerText = scoreLabelData.text.replace('{score}', gameState.score);
        }
    }
}