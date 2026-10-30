namespace NovaArena.Server.Models;

/// <summary>Public shape of a player, safe to send to every client.</summary>
public sealed record PlayerInfo(
    string Id,
    string Name,
    string Color,
    float X,
    float Y,
    float Radius,
    int Score);

/// <summary>Public shape of a collectible orb.</summary>
public sealed record OrbInfo(string Id, float X, float Y, float Radius);

/// <summary>A single authoritative snapshot of the whole arena.</summary>
public sealed record WorldSnapshot(IReadOnlyList<PlayerInfo> Players, IReadOnlyList<OrbInfo> Orbs);

/// <summary>Returned to a client right after it joins.</summary>
public sealed record JoinResult(string PlayerId, WorldSnapshot World);