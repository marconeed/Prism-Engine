class PatrolBehavior {
    /**
     * @param {PIXI.Sprite} sprite - O sprite ao qual este comportamento está anexado.
     * @param {object} props - As propriedades definidas no blueprint (ex: speed, distance).
     */
    constructor(sprite, props) {
        this.sprite = sprite;
        this.speed = props.speed;
        this.distance = props.distance;

        // O estado agora pertence a esta instância, não ao 'sprite.state' genérico.
        this.left_bound = this.sprite.x;
        this.right_bound = this.sprite.x + this.distance;
        this.direction = 1;
    }

    /**
     * O método update é chamado em cada frame pelo motor de jogo.
     * @param {PIXI.Ticker} ticker - O ticker do PixiJS, para informações de tempo.
     */
    update(ticker) {
        // A lógica de movimento é a mesma de antes.
        this.sprite.x += this.speed * this.direction;

        // A lógica de inversão de direção também.
        if (this.sprite.x > this.right_bound && this.direction === 1) {
            this.direction = -1;
        } else if (this.sprite.x < this.left_bound && this.direction === -1) {
            this.direction = 1;
        }
    }
}