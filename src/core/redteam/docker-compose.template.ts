export const DOCKER_COMPOSE_TEMPLATE = `# ==============================================================================
# Fable RedTeam Orchestration Sandbox Network
# Generated automatically by 'get-fable redteam setup'
# Safe, isolated container network for ethical penetration testing and audits.
# ==============================================================================

version: '3.8'

services:
  # 0x4m4/HexStrike-AI: Tool Context & Execution Gateway (150+ tools via MCP/CLI)
  hexstrike-mcp:
    image: ghcr.io/0x4m4/hexstrike-ai:latest
    container_name: fable-redteam-hexstrike
    restart: "no"
    networks:
      - redteam-isolated-net
    environment:
      - SAFE_MODE=true
      - RATE_LIMIT_RPS=10
    volumes:
      - ../reports:/app/reports
    mem_limit: 1024m
    cpus: 1.0

  # akto-api-security/akto: Automated API Business Logic & OWASP API Top 10
  akto-mini:
    image: akto-api-security/akto-api-testing:latest
    container_name: fable-redteam-akto
    restart: "no"
    networks:
      - redteam-isolated-net
    environment:
      - SAFE_MODE=true
      - AKTO_TEST_MODE=automated
    volumes:
      - ../reports:/app/reports
    mem_limit: 1024m
    cpus: 1.0

  # vxcontrol/pentagi: Sandboxed Autonomous Multi-Agent Swarm
  pentagi-sandbox:
    image: ghcr.io/vxcontrol/pentagi:latest
    container_name: fable-redteam-pentagi
    restart: "no"
    networks:
      - redteam-isolated-net
    environment:
      - SWARM_SAFE_MODE=true
      - EXECUTION_TIMEOUT_SECONDS=180
    volumes:
      - ../reports:/app/reports
    mem_limit: 1536m
    cpus: 1.5

networks:
  redteam-isolated-net:
    driver: bridge
    internal: false
`;

export const MCP_CONFIG_TEMPLATE = {
  mcpServers: {
    hexstrike: {
      command: "docker",
      args: [
        "run",
        "-i",
        "--rm",
        "--network",
        "redteam-isolated-net",
        "-e",
        "SAFE_MODE=true",
        "ghcr.io/0x4m4/hexstrike-ai:latest",
        "mcp-server"
      ]
    },
    cyberstrike: {
      command: "bun",
      args: ["./bin/get-fable.js", "redteam", "attack-graph", "--stdio"]
    }
  }
};
