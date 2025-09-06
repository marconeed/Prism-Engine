class DeleteObjectCommand {
    /**
     * @param {object} context O contexto do editor.
     * @param {PIXI.Sprite} spriteToDelete O sprite a ser apagado.
     */
    constructor(context, spriteToDelete) {
        this.context = context;
        this.spriteToDelete = spriteToDelete;
        
        // Faz uma cópia profunda dos dados para poder recriá-los.
        this.deletedObjectData = JSON.parse(JSON.stringify(spriteToDelete.dataSource));
        
        // NOVO: Encontra e guarda o índice original do objeto na lista da cena.
        this.originalIndex = this.context.worldData().sceneObjects.findIndex(obj => obj.id === this.deletedObjectData.id);
    }

    execute() {
        this.context.deleteObjectById(this.deletedObjectData.id);
    }

    undo() {
        // Agora passamos também o índice para a função de recriar.
        this.context.recreateObject(this.deletedObjectData, this.originalIndex);
    }
}