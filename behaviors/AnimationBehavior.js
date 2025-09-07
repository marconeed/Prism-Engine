class AnimationBehavior {
    constructor(sprite, props) {
        this.sprite = sprite;

        // Verifica se o sprite é um AnimatedSprite
        if (!(this.sprite instanceof PIXI.AnimatedSprite)) {
            console.error("AnimationBehavior só pode ser usado com um AnimatedSprite.");
            return;
        }

        this.sprite.animationSpeed = props.animationSpeed || 1;
        this.sprite.loop = props.loop || false;
        
        // Quando a animação terminar (se não for em loop)...
        this.sprite.onComplete = () => {
            // ...marca o objeto para ser destruído.
            this.sprite.isMarkedForDeletion = true;
        };

        this.sprite.play();
    }

    // A lógica de animação é tratada pelo próprio AnimatedSprite,
    // então o update pode ficar vazio por agora.
    update(ticker) {
        // Nada a fazer aqui por enquanto.
    }
}