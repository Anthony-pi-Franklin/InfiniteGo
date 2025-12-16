# InfiniteGo Deployment Script
# Purpose: One-click deployment and launch of InfiniteGo using Docker

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('up', 'down', 'restart', 'logs', 'clean')]
    [string]$Action = 'up'
)

$ErrorActionPreference = 'Stop'

function Write-Status {
    param([string]$Message, [string]$Status = 'INFO')
    $color = @{
        'INFO'    = 'Green'
        'WARNING' = 'Yellow'
        'ERROR'   = 'Red'
        'BUILD'   = 'Cyan'
    }[$Status] ?? 'White'
    Write-Host "[$Status] $Message" -ForegroundColor $color
}

function Test-Docker {
    Write-Status 'Checking Docker installation...' 'BUILD'
    try {
        $version = docker --version
        Write-Status "Found: $version" 'INFO'
        return $true
    } catch {
        Write-Status 'Docker is not installed or not in PATH' 'ERROR'
        Write-Status 'Please install Docker Desktop from https://www.docker.com/products/docker-desktop' 'WARNING'
        return $false
    }
}

function Test-DockerDaemon {
    Write-Status 'Checking Docker daemon...' 'BUILD'
    try {
        docker ps > $null 2>&1
        Write-Status 'Docker daemon is running' 'INFO'
        return $true
    } catch {
        Write-Status 'Docker daemon is not running' 'ERROR'
        Write-Status 'Please start Docker Desktop' 'WARNING'
        return $false
    }
}

function Deploy-Services {
    Write-Status 'Starting InfiniteGo services...' 'BUILD'
    
    # Check for docker-compose.yml
    if (-not (Test-Path 'docker-compose.yml')) {
        Write-Status 'docker-compose.yml not found in current directory' 'ERROR'
        exit 1
    }
    
    # Pull latest images and build
    Write-Status 'Pulling images and building...' 'BUILD'
    docker-compose pull
    docker-compose build --no-cache
    
    # Start services
    Write-Status 'Starting containers...' 'BUILD'
    docker-compose up -d
    
    # Wait for services to be ready
    Write-Status 'Waiting for services to be ready...' 'BUILD'
    Start-Sleep -Seconds 3
    
    # Check if services are running
    $running = docker-compose ps --services --filter "status=running"
    if ($running) {
        Write-Status "Running services: $running" 'INFO'
    }
    
    # Display service info
    Write-Status '' 'INFO'
    Write-Status '========================================' 'INFO'
    Write-Status 'InfiniteGo Services Started' 'INFO'
    Write-Status '========================================' 'INFO'
    Write-Status 'Client (Nginx):  http://localhost:8081' 'INFO'
    Write-Status 'Server API:      http://localhost:8080' 'INFO'
    Write-Status 'Lobby:           http://localhost:8081/lobby.html' 'INFO'
    Write-Status 'API Rooms:       http://localhost:8080/api/rooms' 'INFO'
    Write-Status '========================================' 'INFO'
    Write-Status '' 'INFO'
    
    # Open browser
    Write-Status 'Opening browser...' 'BUILD'
    Start-Sleep -Seconds 1
    Start-Process 'http://localhost:8081/lobby.html'
}

function Shutdown-Services {
    Write-Status 'Stopping InfiniteGo services...' 'BUILD'
    docker-compose down
    Write-Status 'Services stopped' 'INFO'
}

function Restart-Services {
    Write-Status 'Restarting InfiniteGo services...' 'BUILD'
    docker-compose restart
    Write-Status 'Services restarted' 'INFO'
    Start-Sleep -Seconds 2
    Write-Status 'Opening browser...' 'BUILD'
    Start-Process 'http://localhost:8081/lobby.html'
}

function Show-Logs {
    Write-Status 'Displaying service logs (Ctrl+C to exit)...' 'BUILD'
    docker-compose logs -f --tail=50
}

function Clean-Services {
    Write-Status 'Cleaning up Docker resources...' 'BUILD'
    Write-Status 'Stopping containers...' 'BUILD'
    docker-compose down --remove-orphans
    
    Write-Status 'Removing unused images...' 'BUILD'
    docker image prune -f
    
    Write-Status 'Cleaning complete' 'INFO'
}

# Main execution
try {
    # Verify Docker is available
    if (-not (Test-Docker)) {
        exit 1
    }
    
    if (-not (Test-DockerDaemon)) {
        exit 1
    }
    
    # Get the directory where the script is located
    $ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    Set-Location $ScriptDir
    
    Write-Status 'InfiniteGo Deployment Script' 'BUILD'
    Write-Status 'Current directory: ' + (Get-Location) 'INFO'
    Write-Status '' 'INFO'
    
    switch ($Action) {
        'up' {
            Deploy-Services
        }
        'down' {
            Shutdown-Services
        }
        'restart' {
            Shutdown-Services
            Start-Sleep -Seconds 2
            Deploy-Services
        }
        'logs' {
            Show-Logs
        }
        'clean' {
            Clean-Services
        }
        default {
            Write-Status "Unknown action: $Action" 'WARNING'
            Write-Status 'Available actions: up, down, restart, logs, clean' 'INFO'
        }
    }
} catch {
    Write-Status "Error: $_" 'ERROR'
    exit 1
}