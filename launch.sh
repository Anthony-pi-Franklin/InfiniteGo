#!/usr/bin/env bash
# InfiniteGo Docker Deployment Script for Linux/Mac

set -e

ACTION="${1:-up}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_status() {
    local message="$1"
    local status="${2:-INFO}"
    
    case "$status" in
        ERROR)
            echo -e "${RED}[ERROR]${NC} $message"
            ;;
        WARNING)
            echo -e "${YELLOW}[WARNING]${NC} $message"
            ;;
        BUILD)
            echo -e "${CYAN}[BUILD]${NC} $message"
            ;;
        *)
            echo -e "${GREEN}[INFO]${NC} $message"
            ;;
    esac
}

check_docker() {
    print_status "Checking Docker installation..." "BUILD"
    if ! command -v docker &> /dev/null; then
        print_status "Docker is not installed" "ERROR"
        print_status "Please install Docker from https://www.docker.com/products/docker-desktop" "WARNING"
        exit 1
    fi
    
    local version=$(docker --version)
    print_status "Found: $version" "INFO"
}

check_docker_daemon() {
    print_status "Checking Docker daemon..." "BUILD"
    if ! docker ps &> /dev/null; then
        print_status "Docker daemon is not running" "ERROR"
        print_status "Please start Docker" "WARNING"
        exit 1
    fi
    
    print_status "Docker daemon is running" "INFO"
}

deploy_services() {
    print_status "Starting InfiniteGo services..." "BUILD"
    
    cd "$SCRIPT_DIR"
    
    if [ ! -f "docker-compose.yml" ]; then
        print_status "docker-compose.yml not found" "ERROR"
        exit 1
    fi
    
    print_status "Pulling images and building..." "BUILD"
    docker-compose pull
    docker-compose build --no-cache
    
    print_status "Starting containers..." "BUILD"
    docker-compose up -d
    
    print_status "Waiting for services to be ready..." "BUILD"
    sleep 3
    
    local running=$(docker-compose ps --services --filter "status=running" 2>/dev/null || true)
    if [ -n "$running" ]; then
        print_status "Running services: $running" "INFO"
    fi
    
    echo ""
    print_status "========================================" "INFO"
    print_status "InfiniteGo Services Started" "INFO"
    print_status "========================================" "INFO"
    print_status "Client (Nginx):  http://localhost:8081" "INFO"
    print_status "Server API:      http://localhost:8080" "INFO"
    print_status "Lobby:           http://localhost:8081/lobby.html" "INFO"
    print_status "API Rooms:       http://localhost:8080/api/rooms" "INFO"
    print_status "========================================" "INFO"
    echo ""
    
    print_status "Opening browser..." "BUILD"
    sleep 1
    
    if command -v xdg-open &> /dev/null; then
        xdg-open "http://localhost:8081/lobby.html"
    elif command -v open &> /dev/null; then
        open "http://localhost:8081/lobby.html"
    else
        print_status "Please open http://localhost:8081/lobby.html in your browser" "WARNING"
    fi
}

shutdown_services() {
    print_status "Stopping InfiniteGo services..." "BUILD"
    cd "$SCRIPT_DIR"
    docker-compose down
    print_status "Services stopped" "INFO"
}

restart_services() {
    print_status "Restarting InfiniteGo services..." "BUILD"
    cd "$SCRIPT_DIR"
    docker-compose restart
    print_status "Services restarted" "INFO"
    sleep 2
    
    print_status "Opening browser..." "BUILD"
    if command -v xdg-open &> /dev/null; then
        xdg-open "http://localhost:8081/lobby.html"
    elif command -v open &> /dev/null; then
        open "http://localhost:8081/lobby.html"
    fi
}

show_logs() {
    print_status "Displaying service logs (Ctrl+C to exit)..." "BUILD"
    cd "$SCRIPT_DIR"
    docker-compose logs -f --tail=50
}

clean_services() {
    print_status "Cleaning up Docker resources..." "BUILD"
    cd "$SCRIPT_DIR"
    
    print_status "Stopping containers..." "BUILD"
    docker-compose down --remove-orphans
    
    print_status "Removing unused images..." "BUILD"
    docker image prune -f
    
    print_status "Cleaning complete" "INFO"
}

show_usage() {
    cat << EOF
InfiniteGo Deployment Script

Usage: ./launch.sh [ACTION]

Actions:
  up       Start all services (default)
  down     Stop all services
  restart  Restart all services
  logs     Show service logs
  clean    Clean up Docker resources
  help     Show this help message

Examples:
  ./launch.sh              # Start services
  ./launch.sh restart      # Restart services
  ./launch.sh logs         # Show logs

EOF
}

# Main execution
main() {
    check_docker
    check_docker_daemon
    
    print_status "InfiniteGo Deployment Script" "BUILD"
    print_status "Current directory: $SCRIPT_DIR" "INFO"
    echo ""
    
    case "$ACTION" in
        up)
            deploy_services
            ;;
        down)
            shutdown_services
            ;;
        restart)
            shutdown_services
            sleep 2
            deploy_services
            ;;
        logs)
            show_logs
            ;;
        clean)
            clean_services
            ;;
        help)
            show_usage
            ;;
        *)
            print_status "Unknown action: $ACTION" "WARNING"
            show_usage
            exit 1
            ;;
    esac
}

main
