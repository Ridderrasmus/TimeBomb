var builder = DistributedApplication.CreateBuilder(args);

var server = builder.AddProject<Projects.TimeBomb_Server>("server")
    .WithHttpHealthCheck("/health")
    .WithExternalHttpEndpoints();

var webfrontend = builder.AddViteApp("webfrontend", "../frontend")
    .WithReference(server)
    .WaitFor(server);

server.PublishWithContainerFiles(webfrontend, "wwwroot");

//var devtunnel = builder.AddDevTunnel("webdevtunnel").WithReference(webfrontend).WithAnonymousAccess();



builder.Build().Run();


