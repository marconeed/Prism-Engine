class ScreenBoundsBehavior {
    constructor(sprite, props) {
        this.sprite = sprite;
    }

    update(ticker) {
        const halfWidth = this.sprite.width / 2;
        const halfHeight = this.sprite.height / 2;
        
        // Corrige a borda esquerda (x)
        if (this.sprite.x < halfWidth) {
            this.sprite.x = halfWidth;
        }
        
        // Corrige a borda direita (x)
        if (this.sprite.x > app.screen.width - halfWidth) {
            this.sprite.x = app.screen.width - halfWidth;
        }
        
        // Corrige a borda superior (y)
        if (this.sprite.y < halfHeight) {
            this.sprite.y = halfHeight;
        }
        
        // Corrige a borda inferior (y)
        if (this.sprite.y > app.screen.height - halfHeight) {
            this.sprite.y = app.screen.height - halfHeight;
        }
    }
}