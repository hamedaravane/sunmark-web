$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")
$composeArgs = @("compose")
if ($env:SUNMARK_COMPOSE_OVERRIDE) { $composeArgs += @("-f", "compose.yml", "-f", $env:SUNMARK_COMPOSE_OVERRIDE) }
function Run-Docker([string[]] $CommandArgs) {
    & docker @CommandArgs
    if ($LASTEXITCODE -ne 0) { throw "Docker command failed with exit code $LASTEXITCODE" }
}
Run-Docker -CommandArgs @("info", "--format", "{{.ServerVersion}}")
Run-Docker -CommandArgs ($composeArgs + @("config", "--quiet"))
if ($env:SUNMARK_BUILD_BACKEND -eq "1") { Run-Docker -CommandArgs ($composeArgs + @("build", "api")) }
Run-Docker -CommandArgs ($composeArgs + @("build", "web"))
Run-Docker -CommandArgs ($composeArgs + @("up", "-d", "--wait", "api", "web"))
$webPort = if ($env:WEB_PORT) { $env:WEB_PORT } else { "8081" }
Write-Host "Open http://localhost:$webPort on your desktop."
Write-Host "Use separate browser profiles for additional players. Stop with: docker compose stop"
