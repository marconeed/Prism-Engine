class CommandManager {
    constructor() {
        this.undoStack = [];
        this.redoStack = [];
    }

    /**
     * Executa um comando e adiciona-o à pilha de undo.
     * @param {object} command - Um objeto que tem os métodos execute() e undo().
     */
    execute(command) {
        command.execute();
        this.undoStack.push(command);
        // Quando uma nova ação é executada, a pilha de redo é limpa.
        this.redoStack = []; 
    }

    undo() {
        if (this.undoStack.length > 0) {
            const command = this.undoStack.pop();
            command.undo();
            this.redoStack.push(command);
            console.log("Desfeito. Ações para refazer:", this.redoStack.length);
        } else {
            console.log("Nada para desfazer.");
        }
    }

    redo() {
        if (this.redoStack.length > 0) {
            const command = this.redoStack.pop();
            command.execute(); // Refazer é simplesmente executar novamente.
            this.undoStack.push(command);
            console.log("Refeito. Ações para desfazer:", this.undoStack.length);
        } else {
            console.log("Nada para refazer.");
        }
    }

    reset() {
        this.undoStack = [];
        this.redoStack = [];
        console.log("Histórico de comandos foi limpo.");
    }
}