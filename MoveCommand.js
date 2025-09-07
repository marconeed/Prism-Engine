class MoveCommand {
    /**
     * @param {PIXI.Sprite} sprite - O sprite que foi movido.
     * @param {{x: number, y: number}} oldPos - A posição antes do movimento.
     * @param {{x: number, y: number}} newPos - A posição final após o movimento.
     */
    constructor(sprite, oldPos, newPos) {
        this.sprite = sprite;
        this.oldPos = oldPos;
        this.newPos = newPos;
    }

    execute() {
        // Aplica a nova posição ao sprite e aos dados
        this.sprite.position.set(this.newPos.x, this.newPos.y);
        this.sprite.dataSource.position = { ...this.newPos };
        // (Num sistema mais complexo, aqui também se atualizaria a UI)
    }

    undo() {
        // Reverte para a posição antiga
        this.sprite.position.set(this.oldPos.x, this.oldPos.y);
        this.sprite.dataSource.position = { ...this.oldPos };
    }
}