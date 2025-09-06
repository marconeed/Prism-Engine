class CreateObjectCommand {
    /**
     * @param {object} context O contexto do editor (worldData, pixiApp, etc.).
     * @param {string} blueprintId O ID do blueprint a ser criado.
     * @param {{x: number, y: number}} position A posição onde criar o objeto.
     */
    constructor(context, blueprintId, position) {
        this.context = context; // Guarda a referência ao editor
        this.blueprintId = blueprintId;
        this.position = position;
        this.createdObjectId = null; // Guardará o ID único do objeto criado
    }

    execute() {
        const newObjectData = this.context.addNewObjectToScene(this.blueprintId, this.position);
        this.createdObjectId = newObjectData.id;
    }

    undo() {
        if (this.createdObjectId) {
            this.context.deleteObjectById(this.createdObjectId);
        }
    }
}