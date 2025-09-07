class ScaleCommand {
    /**
     * @param {PIXI.Sprite} sprite O sprite que foi redimensionado.
     * @param {{x: number, y: number}} oldScale A escala antes da alteração.
     * @param {{x: number, y: number}} newScale A escala final após a alteração.
     */
    constructor(sprite, oldScale, newScale) {
        this.sprite = sprite;
        this.oldScale = oldScale;
        this.newScale = newScale;
    }

    execute() {
        this.sprite.scale.set(this.newScale.x, this.newScale.y);
        this.sprite.dataSource.scale = { ...this.newScale };
    }

    undo() {
        this.sprite.scale.set(this.oldScale.x, this.oldScale.y);
        this.sprite.dataSource.scale = { ...this.oldScale };
    }
}