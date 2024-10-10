using Microsoft.AspNetCore.Http.Connections;
using Microsoft.Extensions.FileProviders;
using Riganti.Bomberman.Hubs;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSignalR(options =>
{
    options.MaximumParallelInvocationsPerClient = 10;
    options.StreamBufferCapacity = 100;
});

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseFileServer(enableDirectoryBrowsing: false);

app.UseRouting();

app.UseAuthorization();

app.MapHub<ViewHub>("/hubs/view", options =>
{
    options.Transports = HttpTransportType.WebSockets;
});
app.MapHub<PlayerHub>("/hubs/player", options =>
{
    options.Transports = HttpTransportType.WebSockets;
});

app.Run();
