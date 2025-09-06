class RotateCommand {
    /**
     * @param {PIXI.Sprite} sprite O sprite que foi rodado.
     * @param {number} oldRotation A rotação em graus antes da alteração.
     * @param {number} newRotation A rotação final em graus após a alteração.
     */
    constructor(sprite, oldRotation, newRotation) {
        this.sprite = sprite;
        this.oldRotation = oldRotation;
        this.newRotation = newRotation;
    }

    execute() {
        this.sprite.rotation = this.newRotation * (Math.PI / 180); // Converte para radianos
        this.sprite.dataSource.rotation = this.newRotation;
    }

    undo() {
        this.sprite.rotation = this.oldRotation * (Math.PI / 180);
        this.sprite.dataSource.rotation = this.oldRotation;
    }
}