# 🪐 Nova Arena

A real-time multiplayer arena game. Every player is a neon ship in a shared 2D
arena — zoom around, collect the glowing orbs to grow, and race up the
leaderboard against everyone else connected.

## Stack

| Layer    | Tech |
|----------|------|
| Backend  | ASP.NET Core 10 + SignalR (server-authoritative 30 Hz game loop) |
| Frontend | Angular 22 + Ionic 9 |
| Native   | Capacitor 8 (Android platform included) |

```
nova-arena/
├── server/   # .NET 10 minimal API + SignalR hub + game loop
└── client/   # Ionic + Angular app (canvas renderer)
```

## Prerequisites

- .NET SDK 10
- Node.js 20+ and npm
- (optional, for native builds) Android Studio / SDK

## Run it (web)

Two terminals.

**1. Backend**

```powershell
cd nova-arena/server
dotnet run
```

Listens on `http://0.0.0.0:5000`. The real-time hub is at `/gamehub`.

**2. Frontend**

```powershell
cd nova-arena/client
npm start
```

Open http://localhost:4200. To actually test *multiplayer*, open the URL in a
second browser tab (or another browser) and join with a different callsign.

### Controls

- **Desktop**: WASD or arrow keys.
- **Mobile / touch**: the virtual joystick in the bottom-left.

## Run it natively (Android)

```powershell
cd nova-arena/client
npm run build
npx cap sync android
npx cap open android      # opens Android Studio
```

Then build/run from Android Studio on an emulator or device.

### Pointing the app at the server

The client resolves the server URL in `src/app/api.ts`:

- Web / iOS simulator → `http://localhost:5000`
- Android emulator → `http://10.0.2.2:5000` (automatic)

To play from a **physical phone** on the same Wi-Fi, change `api.ts` to point at
your computer's LAN IP (e.g. `http://192.168.1.20:5000`). The server already
binds to `0.0.0.0`, so it's reachable from the LAN.

## How it works

- **Server** owns the state. A `BackgroundService` (`GameLoop.cs`) ticks at 30 Hz,
  moves players from their inputs, handles orb collection, and broadcasts a
  `State` snapshot to every connected client over SignalR.
- **Clients** send only their movement input (`SetInput`); they render the latest
  snapshot on a `<canvas>` with letterboxed 1600×1000 world coordinates.
- Collection, scoring, and growth are all decided server-side, so everyone sees
  the same thing and no client can cheat their size.