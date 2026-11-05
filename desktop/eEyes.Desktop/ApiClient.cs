using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json.Nodes;

namespace eEyes.Desktop;

internal sealed class ApiClient
{
    private readonly HttpClient _http = new() { Timeout = TimeSpan.FromSeconds(60) };
    private readonly TokenStore _tokens;

    public ApiClient(TokenStore tokens) => _tokens = tokens;

    public sealed record Response(int Code, string Body, string? ErrorCode);

    public async Task<Response> RequestAsync(string method, string path, string? jsonBody = null, bool authed = true)
    {
        if (!path.StartsWith("/api/eeyes/device/", StringComparison.Ordinal))
            throw new InvalidOperationException("path_not_allowlisted");

        using var req = new HttpRequestMessage(new HttpMethod(method), Config.BaseUrl + path);
        if (authed)
        {
            var token = _tokens.GetToken();
            if (string.IsNullOrEmpty(token)) return new Response(401, "", "unauthorized");
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }
        if (jsonBody is not null)
            req.Content = new StringContent(jsonBody, Encoding.UTF8, "application/json");

        using var resp = await _http.SendAsync(req);
        var body = await resp.Content.ReadAsStringAsync();
        string? err = null;
        try
        {
            err = JsonNode.Parse(body)?["error"]?.GetValue<string>();
            if (string.IsNullOrWhiteSpace(err)) err = null;
        }
        catch { /* ignore */ }
        return new Response((int)resp.StatusCode, body, err);
    }

    public async Task<Response> PairAsync(string code1, string code2, string code3)
    {
        var payload = new JsonObject
        {
            ["code1"] = code1,
            ["code2"] = code2,
            ["code3"] = code3,
            ["platform"] = "desktop",
            ["model"] = Environment.MachineName,
            ["shellVersion"] = Config.ShellVersion,
        }.ToJsonString();
        using var req = new HttpRequestMessage(HttpMethod.Post, Config.BaseUrl + "/api/eeyes/device/pair")
        {
            Content = new StringContent(payload, Encoding.UTF8, "application/json"),
        };
        using var resp = await _http.SendAsync(req);
        var body = await resp.Content.ReadAsStringAsync();
        string? err = null;
        try
        {
            var node = JsonNode.Parse(body);
            err = node?["error"]?.GetValue<string>();
            if (resp.IsSuccessStatusCode)
            {
                var token = node?["token"]?.GetValue<string>();
                if (!string.IsNullOrWhiteSpace(token)) _tokens.SetToken(token);
            }
        }
        catch { /* ignore */ }
        return new Response((int)resp.StatusCode, body, string.IsNullOrWhiteSpace(err) ? null : err);
    }
}
