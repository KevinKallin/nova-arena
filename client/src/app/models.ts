export interface PlayerInfo {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  radius: number;
  score: number;
}

export interface OrbInfo {
  id: string;
  x: number;
  y: number;
  radius: number;
}

export interface WorldSnapshot {
  players: PlayerInfo[];
  orbs: OrbInfo[];
}

export interface JoinResult {
  playerId: string;
  world: WorldSnapshot;
}