$ErrorActionPreference = 'Stop'

$rootPath = $PSScriptRoot

function Wait-DockerContainer {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [int]$TimeoutSeconds = 120
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        $status = (& docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' $Name 2>$null)
        if ($LASTEXITCODE -eq 0) {
            if ($status -eq 'healthy' -or $status -eq 'running') {
                Write-Host "  [ready] $Name ($status)"
                return
            }
            Write-Host "  [wait]  $Name ($status)"
        } else {
            Write-Host "  [wait]  $Name (not found)"
        }
        Start-Sleep -Seconds 2
    }

    throw "Timed out waiting for Docker container '$Name'."
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "docker command was not found. Start Docker Desktop first."
}

Write-Host "Starting mk2 infrastructure..."
& docker compose -f (Join-Path $rootPath "compose.yaml") up -d
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Waiting for mk2 infrastructure..."
Wait-DockerContainer -Name "personal-operating-system-mk2-postgres"
Wait-DockerContainer -Name "personal-operating-system-mk2-redis"

Write-Host ""
Write-Host "Applying mk2 backend database migrations..."
Push-Location (Join-Path $rootPath "backend")
try {
    npm run prisma:migrate
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "Starting mk2 web/api/auth..."
Push-Location $rootPath
try {
    npm run dev:all
} finally {
    Pop-Location
}
