import { Game } from "./game";
import { Player } from "./player";

type WayPoint = { x: number, y: number };

export class Ai {
    constructor(public game: Game, public player: Player) {
    }

    doStep(elapsedTime: number) {
        if (this.player.died || this.player.commandQueue.length) {
            return;
        }

        let path: WayPoint[];
        if (this.isInExplosionRange(this.player.x, this.player.y)) {
            // run away from a bomb
            path = this.findPath(p => !this.isInExplosionRange(p.x, p.y));
        } else {
            // find closest target
            const target = this.findClosestTarget();
            if (!target) {
                return;
            }

            if (this.getDistance(target) <= 1) {
                // I am next to the target - place bomb
                this.player.addCommand("b");
                return;
            }
            else {
                // chase the target
                path = this.findPath(p => Math.abs(p.x - target.x) + Math.abs(p.y - target.y) === 1);
            }
        }

        if (path && path.length > 0) {
            // generate commands for next 4 steps
            let current: WayPoint = { x: Math.round(this.player.x), y: Math.round(this.player.y) };
            for (let i = 0; i < path.length && i < 4; i++) {
                const next = path[i];
                if (next.y < current.y) {
                    this.player.addCommand("u");
                } else if (next.y > current.y) {
                    this.player.addCommand("d");
                } else if (next.x < current.x) {
                    this.player.addCommand("l");
                } else if (next.x > current.x) {
                    this.player.addCommand("r");
                }
                current = next;
            }

            if (Math.random() > 0.98) {
                this.player.addCommand("b");
            }
        }
    }

    findClosestTarget(): Player | null {
        let closest: Player | null = null;
        for (let player of this.game.players) {
            if (player === this.player || player.died) {
                continue;
            }
            if (!closest || this.getDistance(player) < this.getDistance(closest)) {
                closest = player;
            }
        }
        return closest;
    }

    getDistance(other: Player): number {
        return Math.abs(this.player.x - other.x) + Math.abs(this.player.y - other.y);
    }

    isInExplosionRange(x: number, y: number): boolean {
        return this.game.bombs.some(b => b.isInRange(x, y));
    }

    findPath(filter: (p: WayPoint) => boolean) {
        const visited = new Set<string>();
        const queue: { point: WayPoint, path: WayPoint[] }[] = [
            { point: { x: Math.round(this.player.x), y: Math.round(this.player.y) }, path: [] }
        ];

        // get random order of neighbor coordinates
        const neighborPoints = [ { x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: -1 }, { x: 0, y: 1 } ];
        for (let i = 0; i < 5; i++) {
            const a = Math.floor(Math.random() * neighborPoints.length);
            const b = Math.floor(Math.random() * neighborPoints.length);
            const temp = neighborPoints[a];
            neighborPoints[a] = neighborPoints[b];
            neighborPoints[b] = temp;
        }

        while (queue.length) {
            const current = queue.shift()!;
            if (visited.has(`${current.point.x},${current.point.y}`)) {
                continue;
            }
            visited.add(`${current.point.x},${current.point.y}`);

            if (filter(current.point)) {
                return current.path;
            }

            for (let neighbor of neighborPoints) {
                const x = current.point.x + neighbor.x;
                const y = current.point.y + neighbor.y;

                if (this.game.canMoveTo(x, y)) {
                    queue.push({ point: { x, y }, path: [...current.path, { x, y }] });
                }
            }
        }
        return [];
    }
}