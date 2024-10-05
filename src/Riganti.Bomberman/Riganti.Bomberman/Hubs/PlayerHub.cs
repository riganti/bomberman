using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;

namespace Riganti.Bomberman.Hubs;

public class PlayerHub(IHubContext<ViewHub> viewHubContext) : Hub
{

    private static readonly ConcurrentDictionary<string, string> players = new();
    private static readonly string[] allowedCommands = ["u", "d", "l", "r", "b"];

    public async Task JoinPlayer(string name)
    {
        players.TryAdd(Context.ConnectionId, name);

        await viewHubContext.Clients.All.SendAsync("joinPlayer", Context.ConnectionId, name);
    }

    public async Task PlayerCommand(string command)
    {
        if (allowedCommands.Contains(command))
        {
            await viewHubContext.Clients.All.SendAsync("playerCommand", Context.ConnectionId, command);
        }
    }

    public async Task GameEnded()
    {
        await Clients.All.SendAsync("gameEnded");
    }

    public override Task OnDisconnectedAsync(Exception? exception)
    {
        players.TryRemove(Context.ConnectionId, out _);

        return base.OnDisconnectedAsync(exception);
    }

}
