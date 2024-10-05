using Microsoft.Extensions.FileProviders;
using Riganti.Bomberman.Hubs;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSignalR();

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

app.MapHub<ViewHub>("/hubs/view");
app.MapHub<PlayerHub>("/hubs/player");

app.Run();
