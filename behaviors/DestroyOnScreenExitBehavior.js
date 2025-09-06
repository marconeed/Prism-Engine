class DestroyOnScreenExitBehavior {
    constructor(sprite, props) {
        this.sprite = sprite;
    }

    update(ticker) {
        if (this.sprite.x < 0 || this.sprite.x > app.screen.width || this.sprite.y < 0 || this.sprite.y > app.screen.height) {
            // Em vez de chamar destroyGameObject() diretamente,
            // marcamos o sprite para ser destruído pelo loop principal.
            // Isso é mais seguro.
            this.sprite.isMarkedForDeletion = true;
        }
    }
}