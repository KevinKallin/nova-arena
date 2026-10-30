using Microsoft.AspNetCore.SignalR;
using NovaArena.Server.Hubs;

namespace NovaArena.Server.Game;

/// <summary>
/// Runs the authoritative simulation at a fixed rate and broadcasts snapshots.
/// </summary>
public sealed class GameLoop : BackgroundService
{
    private static readonly TimeSpan TickInterval = TimeSpan.FromMilliseconds(33); // ~30 Hz

    private readonly GameState _state;
    private readonly IHubContext<GameHub> _hub;
    private readonly ILogger<GameLoop> _logger;

    public GameLoop(GameState state, IHubContext<GameHub> hub, ILogger<GameLoop> logger)
    {
        _state = state;
        _hub = hub;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Nova Arena game loop started at {Hz} Hz", 1000 / TickInterval.TotalMilliseconds);

        using var timer = new PeriodicTimer(TickInterval);
        var previous = DateTime.UtcNow;

        try
        {
            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                var now = DateTime.UtcNow;
                var dt = Math.Min((float)(now - previous).TotalSeconds, 0.25f);
                previous = now;

                var snapshot = _state.Tick(dt);
                if (snapshot is not null)
                {
                    await _hub.Clients.All.SendAsync("State", snapshot, stoppingToken);
                }
            }
        }
        catch (OperationCanceledException)
        {
            // Expected on shutdown.
        }
    }
}