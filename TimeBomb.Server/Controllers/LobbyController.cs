using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using TimeBomb.Server.Classes;
using TimeBomb.Server.Hubs;

namespace TimeBomb.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class LobbyController : ControllerBase
    {
        private readonly LobbyStore _lobbyStore;
        private readonly IHubContext<GameHub> _hubContext;
        private readonly IWebHostEnvironment _environment;

        public LobbyController(LobbyStore lobbyStore, IHubContext<GameHub> hubContext, IWebHostEnvironment environment)
        {
            _lobbyStore = lobbyStore;
            _hubContext = hubContext;
            _environment = environment;
        }

        [HttpGet]
        public ActionResult<IReadOnlyList<LobbySummaryResponse>> GetAll()
        {
            var lobbies = _lobbyStore.GetAll()
                .Select(ToSummaryResponse)
                .ToList();

            return Ok(lobbies);
        }

        [HttpGet("{lobbyCode}")]
        public ActionResult<LobbyResponse> GetByCode([FromRoute] string lobbyCode)
        {
            var lobby = _lobbyStore.GetByCode(lobbyCode);
            if (lobby is null)
            {
                return NotFound();
            }

            return Ok(ToLobbyResponse(lobby));
        }

        [HttpPost]
        public ActionResult<LobbyResponse> Create([FromBody] CreateLobbyRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.PlayerName))
            {
                return ValidationProblem("Player name is required.");
            }

            var lobby = _lobbyStore.Create(request.LobbyName ?? "New Lobby", request.PlayerName, request.PlayerId);
            return CreatedAtAction(nameof(GetByCode), new { lobbyCode = lobby.LobbyCode }, ToLobbyResponse(lobby));
        }

        [HttpPost("{lobbyCode}/join")]
        public async Task<ActionResult<LobbyResponse>> Join([FromRoute] string lobbyCode, [FromBody] JoinLobbyRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.PlayerName))
            {
                return ValidationProblem("Player name is required.");
            }

            var success = _lobbyStore.TryJoin(lobbyCode, request.PlayerName, request.PlayerId, out var lobby, out var error);
            if (!success)
            {
                return Problem(detail: error, statusCode: StatusCodes.Status400BadRequest);
            }

            await BroadcastLobbyStateAsync(lobby!);
            return Ok(ToLobbyResponse(lobby!));
        }

        [HttpPost("{lobbyCode}/leave")]
        public async Task<IActionResult> Leave([FromRoute] string lobbyCode, [FromBody] LeaveLobbyRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.PlayerId))
            {
                return ValidationProblem("Player id is required.");
            }

            var success = _lobbyStore.TryLeave(lobbyCode, request.PlayerId, out var lobby, out var error);
            if (!success)
            {
                return Problem(detail: error, statusCode: StatusCodes.Status400BadRequest);
            }

            if (lobby is null)
            {
                await _hubContext.Clients.Group(HubGroups.Lobby(lobbyCode)).SendAsync("LobbyDeleted", lobbyCode);
                return NoContent();
            }

            await BroadcastLobbyStateAsync(lobby);
            return Ok(ToLobbyResponse(lobby));
        }

        [HttpDelete("{lobbyCode}")]
        public async Task<IActionResult> Delete([FromRoute] string lobbyCode)
        {
            var existingLobby = _lobbyStore.GetByCode(lobbyCode);
            var deleted = _lobbyStore.Delete(lobbyCode);
            if (deleted && existingLobby is not null)
            {
                await _hubContext.Clients.Group(HubGroups.Lobby(lobbyCode)).SendAsync("LobbyDeleted", lobbyCode);
            }

            return deleted ? NoContent() : NotFound();
        }

        [HttpGet("{lobbyCode}/can-start")]
        public IActionResult CanStart([FromRoute] string lobbyCode, [FromQuery] string? playerId)
        {
            var canStart = _lobbyStore.CanStart(lobbyCode, playerId, out var error);
            return Ok(new { canStart, error });
        }

        [HttpPut("{lobbyCode}/rules")]
        public async Task<ActionResult<LobbyResponse>> UpdateRules([FromRoute] string lobbyCode, [FromBody] UpdateLobbyRulesRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.PlayerId))
            {
                return ValidationProblem("Player id is required.");
            }

            var success = _lobbyStore.TryUpdateRules(
                lobbyCode,
                request.PlayerId,
                new LobbyRulesSettings
                {
                    Variant = request.Variant,
                    RandomizeCardColors = request.RandomizeCardColors,
                    SelectedBombColors = request.SelectedBombColors
                },
                out var lobby,
                out var error);

            if (!success)
            {
                return Problem(detail: error, statusCode: StatusCodes.Status400BadRequest);
            }

            await BroadcastLobbyStateAsync(lobby!);
            return Ok(ToLobbyResponse(lobby!));
        }

        [HttpPost("{lobbyCode}/start")]
        public async Task<ActionResult<LobbyResponse>> Start([FromRoute] string lobbyCode, [FromBody] StartLobbyRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.PlayerId))
            {
                return ValidationProblem("Player id is required.");
            }

            var success = _lobbyStore.TryStart(lobbyCode, request.PlayerId, out var lobby, out var error);
            if (!success)
            {
                return Problem(detail: error, statusCode: StatusCodes.Status400BadRequest);
            }

            await BroadcastLobbyStateAsync(lobby!);
            return Ok(ToLobbyResponse(lobby!));
        }

        [HttpPost("{lobbyCode}/debug/spawn-players")]
        public async Task<ActionResult<LobbyResponse>> DebugSpawnPlayers([FromRoute] string lobbyCode)
        {
            if (!IsDebugEnvironment())
            {
                return NotFound();
            }

            var success = _lobbyStore.TryAddDebugPlayers(lobbyCode, out var lobby, out var error);
            if (!success)
            {
                return Problem(detail: error, statusCode: StatusCodes.Status400BadRequest);
            }

            await BroadcastLobbyStateAsync(lobby!);
            return Ok(ToLobbyResponse(lobby!));
        }

        private Task BroadcastLobbyStateAsync(GameLobby lobby)
        {
            return _hubContext.Clients
                .Group(HubGroups.Lobby(lobby.LobbyCode))
                .SendAsync("LobbyStateUpdated", LobbyStateMapper.ToDto(lobby));
        }

        private bool IsDebugEnvironment()
        {
            return _environment.IsDevelopment()
                || string.Equals(_environment.EnvironmentName, "QA", StringComparison.OrdinalIgnoreCase);
        }

        private static LobbySummaryResponse ToSummaryResponse(GameLobby lobby)
        {
            return new LobbySummaryResponse(
                lobby.LobbyCode,
                lobby.Name,
                lobby.CurrentState,
                lobby.Players.Count);
        }

        private static LobbyResponse ToLobbyResponse(GameLobby lobby)
        {
            return new LobbyResponse(
                lobby.Id,
                lobby.LobbyCode,
                lobby.Name,
                lobby.CreatedByPlayerId,
                lobby.CurrentState,
                new LobbyRulesResponse(lobby.Rules.Variant, lobby.Rules.RandomizeCardColors, lobby.Rules.SelectedBombColors),
                lobby.Players.Select(player => new PlayerResponse(player.Id, player.Name)).ToList());
        }

        public sealed record CreateLobbyRequest(string? LobbyName, string PlayerName, string? PlayerId);
        public sealed record JoinLobbyRequest(string PlayerName, string? PlayerId);
        public sealed record LeaveLobbyRequest(string PlayerId);
        public sealed record UpdateLobbyRulesRequest(string PlayerId, GameVariant Variant, bool RandomizeCardColors, List<WireColor>? SelectedBombColors);
        public sealed record StartLobbyRequest(string PlayerId);
        public sealed record LobbySummaryResponse(string LobbyCode, string Name, GameState State, int PlayerCount);
        public sealed record PlayerResponse(string Id, string Name);
        public sealed record LobbyRulesResponse(GameVariant Variant, bool RandomizeCardColors, IReadOnlyList<WireColor>? SelectedBombColors);
        public sealed record LobbyResponse(string Id, string LobbyCode, string Name, string CreatedByPlayerId, GameState State, LobbyRulesResponse Rules, IReadOnlyList<PlayerResponse> Players);
    }
}
