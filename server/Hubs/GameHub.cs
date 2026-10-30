using Microsoft.AspNetCore.SignalR;
using NovaArena.Server.Game;
using NovaArena.Server.Models;

namespace NovaArena.Server.Hubs;

public sealed class GameHub : Hub
{
    private readonly GameState _state;

    public GameHub(GameState state)
    {
        _state = state;
    }

    /// <summary>Registers the caller as a player and returns its id plus the current world.</summary>
    public Task<JoinResult> Join(string name)
    {
        var player = _state.AddPlayer(Context.ConnectionId, name);
        var snapshot = _state.GetSnapshot();
        return Task.FromResult(new JoinResult(player.Id, snapshot));
    }

    /// <summary>Streams the caller's movement input on every frame.</summary>
    public Task SetInput(float x, float y)
    {
        _state.SetInput(Context.ConnectionId, x, y);
        return Task.CompletedTask;
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _state.RemovePlayer(Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }
}