using NovaArena.Server.Models;

namespace NovaArena.Server.Game;

/// <summary>
/// Thread-safe, in-memory authoritative game state.
/// The game loop mutates it every tick; the hub reads/writes it from SignalR callbacks.
/// </summary>
public sealed class GameState
{
    public const float WorldWidth = 1600f;
    public const float WorldHeight = 1000f;

    private const float BaseRadius = 20f;
    private const float OrbRadius = 12f;
    private const int OrbCount = 60;
    private const float MinSpeed = 150f;
    private const float BaseSpeed = 320f;

    private readonly object _lock = new();
    private readonly Dictionary<string, Player> _players = new();
    private readonly List<Orb> _orbs = new();
    private readonly Random _rng = new();

    private static readonly string[] Palette =
    {
        "#ff5f6d", "#ffc371", "#43e97b", "#4facfe", "#a18cd1",
        "#f9d423", "#f5576c", "#00e5ff", "#ffeb3b", "#ff4081",
        "#64ffda", "#b388ff", "#ff9a9e", "#40c4ff", "#69f0ae",
    };

    public GameState()
    {
        for (var i = 0; i < OrbCount; i++)
        {
            _orbs.Add(SpawnOrb());
        }
    }

    private Orb SpawnOrb()
    {
        return new Orb
        {
            Id = Guid.NewGuid().ToString("N")[..8],
            X = (float)(_rng.NextDouble() * WorldWidth),
            Y = (float)(_rng.NextDouble() * WorldHeight),
            Radius = OrbRadius,
        };
    }

    public PlayerInfo AddPlayer(string connectionId, string name)
    {
        lock (_lock)
        {
            var player = new Player
            {
                Id = connectionId,
                Name = string.IsNullOrWhiteSpace(name) ? "Player" : name.Trim()[..Math.Min(name.Trim().Length, 16)],
                Color = Palette[_rng.Next(Palette.Length)],
                Radius = BaseRadius,
                Score = 0,
                X = (float)(_rng.NextDouble() * WorldWidth),
                Y = (float)(_rng.NextDouble() * WorldHeight),
            };

            _players[connectionId] = player;
            return ToInfo(player);
        }
    }

    public PlayerInfo? RemovePlayer(string connectionId)
    {
        lock (_lock)
        {
            if (_players.Remove(connectionId, out var player))
            {
                return ToInfo(player);
            }

            return null;
        }
    }

    public void SetInput(string connectionId, float x, float y)
    {
        lock (_lock)
        {
            if (_players.TryGetValue(connectionId, out var player))
            {
                player.InputX = x;
                player.InputY = y;
            }
        }
    }

    /// <summary>Advances the simulation by <paramref name="dt"/> seconds and returns a snapshot (or null if empty).</summary>
    public WorldSnapshot? Tick(float dt)
    {
        lock (_lock)
        {
            if (_players.Count == 0)
            {
                return null;
            }

            var respawned = new List<Orb>();

            foreach (var player in _players.Values)
            {
                // ---- movement -------------------------------------------------
                var speed = Math.Max(MinSpeed, BaseSpeed - player.Score * 2f);
                var ix = Math.Clamp(player.InputX, -1f, 1f);
                var iy = Math.Clamp(player.InputY, -1f, 1f);
                var len = MathF.Sqrt(ix * ix + iy * iy);
                if (len > 1f)
                {
                    ix /= len;
                    iy /= len;
                }

                player.X += ix * speed * dt;
                player.Y += iy * speed * dt;
                player.X = Math.Clamp(player.X, player.Radius, WorldWidth - player.Radius);
                player.Y = Math.Clamp(player.Y, player.Radius, WorldHeight - player.Radius);

                // ---- orb collection ------------------------------------------
                for (var i = _orbs.Count - 1; i >= 0; i--)
                {
                    var orb = _orbs[i];
                    var dx = player.X - orb.X;
                    var dy = player.Y - orb.Y;
                    var reach = player.Radius + orb.Radius;
                    if (dx * dx + dy * dy <= reach * reach)
                    {
                        _orbs.RemoveAt(i);
                        player.Score++;
                        player.Radius = BaseRadius + MathF.Sqrt(player.Score) * 6f;
                        respawned.Add(SpawnOrb());
                    }
                }
            }

            _orbs.AddRange(respawned);

            var players = _players.Values.Select(ToInfo).OrderByDescending(p => p.Score).ToArray();
            var orbs = _orbs.Select(o => new OrbInfo(o.Id, o.X, o.Y, o.Radius)).ToArray();
            return new WorldSnapshot(players, orbs);
        }
    }

    public WorldSnapshot GetSnapshot()
    {
        lock (_lock)
        {
            var players = _players.Values.Select(ToInfo).OrderByDescending(p => p.Score).ToArray();
            var orbs = _orbs.Select(o => new OrbInfo(o.Id, o.X, o.Y, o.Radius)).ToArray();
            return new WorldSnapshot(players, orbs);
        }
    }

    private static PlayerInfo ToInfo(Player p) =>
        new(p.Id, p.Name, p.Color, p.X, p.Y, p.Radius, p.Score);

    private sealed class Player
    {
        public required string Id { get; init; }
        public required string Name { get; init; }
        public required string Color { get; init; }
        public float X { get; set; }
        public float Y { get; set; }
        public float Radius { get; set; }
        public int Score { get; set; }
        public float InputX { get; set; }
        public float InputY { get; set; }
    }

    private sealed class Orb
    {
        public required string Id { get; init; }
        public float X { get; set; }
        public float Y { get; set; }
        public float Radius { get; init; }
    }
}