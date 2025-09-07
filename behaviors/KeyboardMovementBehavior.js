class KeyboardMovementBehavior {
    constructor(sprite, props) {
        this.sprite = sprite;
        this.speed = props.speed;
        // Este comportamento precisa de acesso ao objeto 'keys' global.
        // Uma melhoria futura seria ter um 'InputManager' central.
        // Por enquanto, o acesso global funciona.
    }

    update(ticker) {
        if (keys.ArrowUp) { this.sprite.y -= this.speed; }
        if (keys.ArrowDown) { this.sprite.y += this.speed; }
        if (keys.ArrowLeft) { this.sprite.x -= this.speed; }
        if (keys.ArrowRight) { this.sprite.x += this.speed; }
    }
}