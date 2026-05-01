(function attach(root, factory) {
    const exported = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = exported;
    root.MathMarauder = root.MathMarauder || {};
    root.MathMarauder.Renderer = exported;
})(typeof globalThis !== 'undefined' ? globalThis : window, function buildRenderer() {
    class Renderer {
        constructor(canvas) {
            this._canvas = canvas;
            this._ctx = canvas ? canvas.getContext('2d') : null;
            this._w = 960;
            this._h = 540;
            this._dpr = 1;
            this.resize();
        }

        resize() {
            if (!this._canvas || !this._ctx) return;
            const rect = this._canvas.getBoundingClientRect();
            const cssW = rect.width || 960;
            const cssH = rect.height || 540;
            this._dpr = Math.max(1, Math.min(2, (typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1)));
            const bufferW = Math.round(cssW * this._dpr);
            const bufferH = Math.round(cssH * this._dpr);
            if (this._canvas.width !== bufferW || this._canvas.height !== bufferH) {
                this._canvas.width = bufferW;
                this._canvas.height = bufferH;
            }
            this._ctx.setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
            this._w = cssW;
            this._h = cssH;
        }

        draw(scene) {
            if (!this._ctx) return;
            const state = scene || {};
            this.resize();
            this._drawBackground(state);
            this._drawMonster(state.monsterId || 'ember-imp', state);
            this._drawParticles(state.particles || [], state);
            this._drawSpell(state);
        }

        _drawBackground(scene) {
            const ctx = this._ctx;
            const grd = ctx.createLinearGradient(0, 0, this._w, this._h);
            const palettes = {
                'ember-library': ['#351f47', '#7f1d1d'],
                'moonlit-catacombs': ['#14213d', '#312e81'],
                'dragon-asteroid-belt': ['#020617', '#164e63'],
                'slime-foundry': ['#12372a', '#365314'],
                'void-reef': ['#20113a', '#0e7490'],
                'final-fortress': ['#2c2416', '#7f1d1d']
            };
            const colors = palettes[scene.biomeId] || palettes['ember-library'];
            grd.addColorStop(0, colors[0]);
            grd.addColorStop(1, colors[1]);
            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, this._w, this._h);
            ctx.fillStyle = 'rgba(255, 250, 240, 0.16)';
            for (let i = 0; i < 24; i += 1) {
                const x = (i * 83 + (scene.time || 0) * 0.01) % this._w;
                const y = (i * 47) % (this._h * 0.62);
                ctx.beginPath();
                ctx.arc(x, y, 2 + (i % 3), 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.fillStyle = 'rgba(245, 240, 232, 0.12)';
            ctx.fillRect(0, this._h * 0.72, this._w, this._h * 0.28);
        }

        _drawMonster(monsterId, state) {
            const ctx = this._ctx;
            const cx = this._w / 2;
            const bob = state.reducedMotion ? 0 : Math.sin((state.time || 0) / 350) * 8;
            const cy = this._h * 0.49 + bob;
            const flash = state.hitFlash || 0;
            ctx.save();
            ctx.translate(cx, cy);
            ctx.globalAlpha = state.defeated ? 0.35 : 1;
            const color = flash > 0 ? '#fffaf0' : this._monsterColor(monsterId);
            ctx.fillStyle = color;
            ctx.strokeStyle = '#fffaf0';
            ctx.lineWidth = 4;
            if (monsterId === 'split-slime') this._slime(ctx);
            else if (monsterId === 'rune-knight') this._knight(ctx);
            else if (monsterId === 'factor-dragon') this._dragon(ctx);
            else if (monsterId === 'star-wyvern') this._wyvern(ctx);
            else if (monsterId === 'void-wraith') this._wraith(ctx);
            else if (monsterId === 'crystal-golem') this._golem(ctx);
            else if (monsterId === 'mirror-mage') this._mage(ctx);
            else this._imp(ctx);
            ctx.restore();
            this._drawHealth(state);
        }

        _imp(ctx) {
            ctx.beginPath();
            ctx.moveTo(-70, -20);
            ctx.lineTo(-35, -90);
            ctx.lineTo(0, -38);
            ctx.lineTo(35, -90);
            ctx.lineTo(70, -20);
            ctx.quadraticCurveTo(0, 78, -70, -20);
            ctx.fill();
            ctx.stroke();
            this._eyes(ctx, -24, -12, 24, -12);
        }

        _slime(ctx) {
            ctx.beginPath();
            ctx.ellipse(0, 12, 98, 72, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            this._eyes(ctx, -28, -8, 28, -8);
        }

        _knight(ctx) {
            ctx.fillRect(-56, -74, 112, 144);
            ctx.strokeRect(-56, -74, 112, 144);
            ctx.fillStyle = 'rgba(255,250,240,0.38)';
            ctx.fillRect(-42, -48, 84, 24);
        }

        _mage(ctx) {
            ctx.beginPath();
            ctx.moveTo(0, -112);
            ctx.lineTo(82, 70);
            ctx.lineTo(-82, 70);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            this._eyes(ctx, -22, -6, 22, -6);
        }

        _golem(ctx) {
            for (const box of [[-70, -60, 60, 80], [10, -60, 60, 80], [-48, 20, 96, 70]]) {
                ctx.fillRect(box[0], box[1], box[2], box[3]);
                ctx.strokeRect(box[0], box[1], box[2], box[3]);
            }
        }

        _wyvern(ctx) {
            ctx.beginPath();
            ctx.moveTo(-130, 16);
            ctx.quadraticCurveTo(-48, -96, 0, -28);
            ctx.quadraticCurveTo(48, -96, 130, 16);
            ctx.quadraticCurveTo(42, 54, 0, 78);
            ctx.quadraticCurveTo(-42, 54, -130, 16);
            ctx.fill();
            ctx.stroke();
            this._eyes(ctx, -18, -10, 18, -10);
        }

        _wraith(ctx) {
            ctx.beginPath();
            ctx.ellipse(0, -16, 76, 106, 0, Math.PI, 0);
            ctx.lineTo(72, 72);
            ctx.lineTo(36, 44);
            ctx.lineTo(0, 78);
            ctx.lineTo(-36, 44);
            ctx.lineTo(-72, 72);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            this._eyes(ctx, -24, -24, 24, -24);
        }

        _dragon(ctx) {
            ctx.beginPath();
            ctx.moveTo(-126, 46);
            ctx.lineTo(-66, -52);
            ctx.lineTo(-20, -24);
            ctx.lineTo(0, -100);
            ctx.lineTo(24, -24);
            ctx.lineTo(70, -52);
            ctx.lineTo(126, 46);
            ctx.lineTo(46, 74);
            ctx.lineTo(0, 40);
            ctx.lineTo(-46, 74);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            this._eyes(ctx, -20, -18, 20, -18);
        }

        _eyes(ctx, ax, ay, bx, by) {
            ctx.fillStyle = '#fffaf0';
            ctx.beginPath();
            ctx.arc(ax, ay, 8, 0, Math.PI * 2);
            ctx.arc(bx, by, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#221528';
            ctx.beginPath();
            ctx.arc(ax, ay, 3, 0, Math.PI * 2);
            ctx.arc(bx, by, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        _monsterColor(id) {
            return {
                'ember-imp': '#f97316',
                'split-slime': '#4ade80',
                'rune-knight': '#94a3b8',
                'mirror-mage': '#a78bfa',
                'crystal-golem': '#67e8f9',
                'star-wyvern': '#38bdf8',
                'void-wraith': '#581c87',
                'factor-dragon': '#ef4444'
            }[id] || '#f97316';
        }

        _drawHealth(state) {
            const ctx = this._ctx;
            const max = Math.max(1, state.monsterMaxHp || 1);
            const hp = Math.max(0, state.monsterHp || 0);
            const w = Math.min(360, this._w * 0.5);
            const x = (this._w - w) / 2;
            const y = this._h * 0.12;
            ctx.fillStyle = 'rgba(0,0,0,0.35)';
            ctx.fillRect(x, y, w, 18);
            ctx.fillStyle = '#facc15';
            ctx.fillRect(x, y, w * (hp / max), 18);
            ctx.strokeStyle = '#fffaf0';
            ctx.strokeRect(x, y, w, 18);
        }

        _drawParticles(particles, state) {
            if (state.reducedMotion) return;
            const ctx = this._ctx;
            ctx.fillStyle = '#facc15';
            particles.forEach((p) => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r || 4, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        _drawSpell(state) {
            if (!state.spellFlash) return;
            const ctx = this._ctx;
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.moveTo(this._w * 0.18, this._h * 0.82);
            ctx.lineTo(this._w * 0.5, this._h * 0.48);
            ctx.stroke();
        }
    }

    return Renderer;
});
