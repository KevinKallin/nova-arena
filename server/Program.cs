using NovaArena.Server.Game;
using NovaArena.Server.Hubs;

var builder = WebApplication.CreateBuilder(args);

// Bind to all interfaces so phones/emulators on the same network can reach it during development.
builder.WebHost.UseUrls("http://0.0.0.0:5000");

builder.Services.AddSignalR();
builder.Services.AddSingleton<GameState>();
builder.Services.AddHostedService<GameLoop>();

// Dev-friendly CORS: allow any origin without credentials (SignalR client disables credentials too).
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
});

var app = builder.Build();

app.UseCors();
app.MapHub<GameHub>("/gamehub");
app.MapGet("/", () => Results.Ok("Nova Arena server is running. Hub at /gamehub"));

app.Run();