import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
  computed,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonButton,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { close, trophy } from 'ionicons/icons';
import { GameService } from '../game.service';
import type { PlayerInfo } from '../models';

const WORLD_W = 1600;
const WORLD_H = 1000;
const TAU = Math.PI * 2;

interface Star {
  x: number;
  y: number;
  r: number;
  a: number;
}

@Component({
  selector: 'app-game',
  imports: [
    IonButton,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonNote,
    IonSpinner,
    IonTitle,
    IonToolbar,
  ],
  templateUrl: './game.html',
  styleUrl: './game.scss',
})
export class Game implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;
  private ro?: ResizeObserver;
  private rafId = 0;
  private lastSent = 0;
  private keys = new Set<string>();

  private joyActive = false;
  private joyPointer = -1;
  private joyBase = { x: 0, y: 0 };
  private joyRadius = 44;
  private joyVec = { x: 0, y: 0 };
  knobTransform = 'translate(0px, 0px)';

  private stars: Star[] = [];

  readonly top = computed<PlayerInfo[]>(() => this.game.players().slice(0, 8));

  connecting = true;
  error = '';
  name = 'Player';

  constructor(
    public readonly game: GameService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {
    addIcons({ close, trophy });
  }

  ngAfterViewInit(): void {
    this.name = this.route.snapshot.queryParamMap.get('name')?.trim() || 'Player';
    this.ctx = this.canvasRef.nativeElement.getContext('2d')!;

    for (let i = 0; i < 140; i++) {
      this.stars.push({
        x: Math.random() * WORLD_W,
        y: Math.random() * WORLD_H,
        r: Math.random() * 1.4 + 0.3,
        a: Math.random() * 0.5 + 0.15,
      });
    }

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this.canvasRef.nativeElement.parentElement!);
    this.resize();

    this.loop();
    void this.connect();
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.rafId);
    this.ro?.disconnect();
    void this.game.disconnect();
  }

  async connect(): Promise<void> {
    this.connecting = true;
    this.error = '';
    try {
      await this.game.connect(this.name);
      this.connecting = false;
    } catch {
      this.connecting = false;
      this.error = 'Could not reach the game server. Is it running?';
    }
  }

  leave(): void {
    void this.router.navigate(['/']);
  }

  private loop = (): void => {
    this.rafId = requestAnimationFrame(this.loop);
    const now = performance.now();
    if (now - this.lastSent > 40) {
      this.lastSent = now;
      const v = this.inputVector();
      this.game.sendInput(v.x, v.y);
    }
    this.draw();
  };

  private inputVector(): { x: number; y: number } {
    if (this.joyActive) {
      return { x: this.joyVec.x, y: this.joyVec.y };
    }

    let x = 0;
    let y = 0;
    if (this.keys.has('arrowup') || this.keys.has('w')) y -= 1;
    if (this.keys.has('arrowdown') || this.keys.has('s')) y += 1;
    if (this.keys.has('arrowleft') || this.keys.has('a')) x -= 1;
    if (this.keys.has('arrowright') || this.keys.has('d')) x += 1;

    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.hypot(x, y);
      x *= inv;
      y *= inv;
    }

    return { x, y };
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent): void {
    const k = e.key.toLowerCase();
    this.keys.add(k);
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) {
      e.preventDefault();
    }
  }

  @HostListener('window:keyup', ['$event'])
  onKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.key.toLowerCase());
  }

  // ---- virtual joystick (touch) ----

  joyDown(e: PointerEvent): void {
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    this.joyActive = true;
    this.joyPointer = e.pointerId;
    const r = el.getBoundingClientRect();
    this.joyBase = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    this.updateJoy(e.clientX, e.clientY);
  }

  joyMove(e: PointerEvent): void {
    if (!this.joyActive || e.pointerId !== this.joyPointer) return;
    this.updateJoy(e.clientX, e.clientY);
  }

  joyUp(e: PointerEvent): void {
    if (e.pointerId !== this.joyPointer) return;
    this.joyActive = false;
    this.joyPointer = -1;
    this.joyVec = { x: 0, y: 0 };
    this.knobTransform = 'translate(0px, 0px)';
  }

  private updateJoy(cx: number, cy: number): void {
    let dx = cx - this.joyBase.x;
    let dy = cy - this.joyBase.y;
    const len = Math.hypot(dx, dy);
    if (len > this.joyRadius) {
      dx = (dx / len) * this.joyRadius;
      dy = (dy / len) * this.joyRadius;
    }
    this.knobTransform = `translate(${dx}px, ${dy}px)`;
    this.joyVec = { x: dx / this.joyRadius, y: dy / this.joyRadius };
  }

  // ---- rendering ----

  private resize(): void {
    const canvas = this.canvasRef.nativeElement;
    const parent = canvas.parentElement;
    if (!parent) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(parent.clientWidth * dpr));
    canvas.height = Math.max(1, Math.floor(parent.clientHeight * dpr));
  }

  private draw(): void {
    const canvas = this.canvasRef.nativeElement;
    const cw = canvas.parentElement?.clientWidth ?? 0;
    const ch = canvas.parentElement?.clientHeight ?? 0;
    if (!cw || !ch) return;

    const dpr = window.devicePixelRatio || 1;
    const ctx = this.ctx;

    const scale = Math.min(cw / WORLD_W, ch / WORLD_H);
    const ox = (cw - WORLD_W * scale) / 2;
    const oy = (ch - WORLD_H * scale) / 2;

    // CSS-pixel space: clear everything.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#04060f';
    ctx.fillRect(0, 0, cw, ch);

    // World space.
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, dpr * oy);

    // Arena backdrop.
    ctx.fillStyle = '#0a0e1c';
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);

    // Grid.
    ctx.strokeStyle = 'rgba(90, 130, 220, 0.07)';
    ctx.lineWidth = 2;
    const step = 80;
    ctx.beginPath();
    for (let x = step; x < WORLD_W; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, WORLD_H);
    }
    for (let y = step; y < WORLD_H; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(WORLD_W, y);
    }
    ctx.stroke();

    // Stars.
    ctx.fillStyle = '#9fc1ff';
    for (const s of this.stars) {
      ctx.globalAlpha = s.a;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Orbs.
    for (const orb of this.game.orbs()) {
      const glow = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.radius * 3);
      glow.addColorStop(0, 'rgba(120, 220, 255, 0.9)');
      glow.addColorStop(1, 'rgba(120, 220, 255, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, orb.radius * 3, 0, TAU);
      ctx.fill();

      ctx.fillStyle = '#7df9ff';
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, orb.radius, 0, TAU);
      ctx.fill();
    }

    // Players.
    for (const p of this.game.players()) {
      const glow = ctx.createRadialGradient(p.x, p.y, p.radius * 0.2, p.x, p.y, p.radius * 1.9);
      glow.addColorStop(0, p.color + 'b3');
      glow.addColorStop(1, p.color + '00');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 1.9, 0, TAU);
      ctx.fill();

      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, TAU);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.beginPath();
      ctx.arc(p.x - p.radius * 0.25, p.y - p.radius * 0.25, p.radius * 0.4, 0, TAU);
      ctx.fill();

      if (p.id === this.game.myId()) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(2, p.radius * 0.14);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius + 6, 0, TAU);
        ctx.stroke();
      }

      ctx.fillStyle = '#eaf0ff';
      ctx.font = `600 ${Math.max(13, p.radius * 0.6)}px "Segoe UI", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(p.name, p.x, p.y - p.radius - 12);
      ctx.fillText(String(p.score), p.x, p.y + p.radius * 0.42);
    }

    // Border.
    ctx.strokeStyle = 'rgba(90, 140, 220, 0.35)';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, WORLD_W, WORLD_H);
  }
}