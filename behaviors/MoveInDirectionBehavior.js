class MoveInDirectionBehavior {
    constructor(sprite, props) {
        this.sprite = sprite;
        this.speed = props.speed;
        this.angle = props.angle;

        // Pré-calcula o ângulo em radianos para otimização
        this.angleRad = this.angle * (Math.PI / 180);
    }

    update(ticker) {
        this.sprite.x += Math.cos(this.angleRad) * this.speed;
        this.sprite.y += Math.sin(this.angleRad) * this.speed;
    }
}