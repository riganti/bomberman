using Microsoft.AspNetCore.SignalR;

namespace Riganti.Bomberman.Hubs;

public class ViewHub(IHubContext<PlayerHub> playerHubContext) : Hub
{
    public override async Task OnConnectedAsync()
    {
        await Clients.Others.SendAsync("gameEnded");
        await playerHubContext.Clients.All.SendAsync("gameEnded");

        await base.OnConnectedAsync();
    }

    public async Task PlayerJoined(string connectionId, string color)
    {
        await playerHubContext.Clients.Client(connectionId).SendAsync("playerJoined", color);
    }

    public async Task PlayerKilled(string connectionId)
    {
        await playerHubContext.Clients.Client(connectionId).SendAsync("gameEnded");
    }
}
