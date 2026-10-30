import { Injectable, computed, signal } from '@angular/core';
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { API_URL } from './api';
import type { JoinResult, OrbInfo, PlayerInfo, WorldSnapshot } from './models';

@Injectable({ providedIn: 'root' })
export class GameService {
  private connection: HubConnection | null = null;

  private readonly playerId = signal('');
  private readonly connected = signal(false);
  private readonly snapshot = signal<WorldSnapshot | null>(null);

  readonly myId = this.playerId.asReadonly();
  readonly isConnected = this.connected.asReadonly();
  readonly players = computed<PlayerInfo[]>(() => this.snapshot()?.players ?? []);
  readonly orbs = computed<OrbInfo[]>(() => this.snapshot()?.orbs ?? []);
  readonly me = computed<PlayerInfo | null>(
    () => this.players().find((p) => p.id === this.playerId()) ?? null,
  );

  async connect(name: string): Promise<void> {
    this.connection = new HubConnectionBuilder()
      .withUrl(`${API_URL}/gamehub`, { withCredentials: false })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    this.connection.on('State', (world: WorldSnapshot) => this.snapshot.set(world));

    await this.connection.start();

    const result = await this.connection.invoke<JoinResult>('Join', name);
    this.playerId.set(result.playerId);
    this.snapshot.set(result.world);
    this.connected.set(true);
  }

  sendInput(x: number, y: number): void {
    if (!this.connection || !this.connected()) {
      return;
    }
    this.connection.invoke('SetInput', x, y).catch(() => undefined);
  }

  async disconnect(): Promise<void> {
    const conn = this.connection;
    this.connection = null;
    this.connected.set(false);
    this.playerId.set('');
    this.snapshot.set(null);
    if (conn) {
      try {
        await conn.stop();
      } catch {
        // Best effort.
      }
    }
  }
}