import * as THREE from 'three';

export class Audio {

    listener: THREE.AudioListener;
    placeBombSoundBuffer: AudioBuffer | null = null;
    explosionSoundBuffer: AudioBuffer | null = null;
    existingSounds: THREE.Audio[] = [];

    constructor(public camera: THREE.Camera) {
        this.listener = new THREE.AudioListener();
        this.camera.add(this.listener);

        const audioLoader = new THREE.AudioLoader();

        const ambientMusic = new THREE.Audio(this.listener);
        audioLoader.load('sounds/ambient.mp3', buffer => {
            ambientMusic.setBuffer(buffer);
            ambientMusic.setLoop(true);
            ambientMusic.setVolume(0.5);
            ambientMusic.play();
        });

        audioLoader.load('sounds/place-bomb.mp3', buffer => {
            this.placeBombSoundBuffer = buffer;
        });

        audioLoader.load('sounds/explosion.mp3', buffer => {
            this.explosionSoundBuffer = buffer;
        });
    }

    playPlaceBombSound() {
        const placeBombSound = this.getOrCreateSound(this.placeBombSoundBuffer!);
        placeBombSound.play();
    }

    playExplosionSound() {
        const explosionSound = this.getOrCreateSound(this.explosionSoundBuffer!);
        explosionSound.play();
    }

    getOrCreateSound(buffer: AudioBuffer) {
        let sound = this.existingSounds.find(s => s.buffer === buffer && !s.isPlaying);
        if (!sound) {
            sound = new THREE.Audio(this.listener);
            sound.setBuffer(buffer);
            this.existingSounds.push(sound);
        }
        return sound;
    }
}