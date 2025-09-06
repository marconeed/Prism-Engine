class ShooterBehavior {
    constructor(sprite, props) {
        this.sprite = sprite;
        this.triggerKey = props.triggerKey;
        this.cooldown = props.cooldown;
        this.blueprintId = props.blueprintId;

        // Estado interno do comportamento
        this.lastShotTime = 0;
    }

    update(ticker) {
        if (keys[this.triggerKey]) {
            const currentTime = Date.now();
            const timeSinceLastShot = (currentTime - this.lastShotTime) / 1000.0;

            if (timeSinceLastShot >= this.cooldown) {
                // Este comportamento precisa de chamar a função global 'createGameObject'.
                // Assim como o Input, uma melhoria futura seria passar uma referência do "motor"
                // para o comportamento.
                createGameObject(this.blueprintId, { x: this.sprite.x, y: this.sprite.y });
                this.lastShotTime = currentTime;
            }
        }
    }
}