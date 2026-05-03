# IPv6 Dual-Stack Setup for AACSearch

## Overview

AACSearch supports dual-stack (IPv4 + IPv6) networking out of the box.
All Docker Compose stacks are configured with IPv6 subnets.

## Prerequisites: Docker Daemon IPv6 Support

Docker's default bridge does not support IPv6. You must enable it:

```bash
# Create Docker daemon config (if not exists)
sudo mkdir -p /etc/docker
sudo cp deploy/docker/daemon.json /etc/docker/daemon.json

# Reload Docker daemon
sudo systemctl restart docker
```

Config (`deploy/docker/daemon.json`):

```json
{
	"ipv6": true,
	"fixed-cidr-v6": "fd00:dead:beef::/48",
	"ip6tables": true,
	"experimental": true
}
```

- `fixed-cidr-v6` is the ULA prefix for the default bridge. Compose networks use their own subnets.
- `ip6tables: true` ensures Docker manages IPv6 NAT/firewall rules automatically.

## Subnet Allocation

| Network     | IPv4 CIDR     | IPv6 ULA CIDR          | Compose File                    |
| ----------- | ------------- | ---------------------- | ------------------------------- |
| Dev default | 172.20.0.0/16 | fd00:dead:beef:20::/56 | `docker-compose.yml`            |
| Internal    | 172.21.0.0/16 | fd00:dead:beef:21::/56 | `docker-compose.production.yml` |
| Public      | 172.22.0.0/16 | fd00:dead:beef:22::/56 | `docker-compose.production.yml` |
| Search only | 172.23.0.0/16 | fd00:dead:beef:23::/56 | `docker-compose.search.yml`     |

These ULAs are private (non-routable on the public internet) and safe for any deployment.

## Service IPv6 Readiness

All services bind to `0.0.0.0` (all interfaces) by default, which in Docker with
`enable_ipv6: true` also covers IPv6 connections transparently:

| Service    | Bind Address | IPv6 Ready | Notes                          |
| ---------- | ------------ | ---------- | ------------------------------ |
| Next.js    | 0.0.0.0:3000 | Yes        | Dockerfile: `HOSTNAME=0.0.0.0` |
| PostgreSQL | 0.0.0.0:5432 | Yes        | Default Postgres behavior      |
| Typesense  | 0.0.0.0:8108 | Yes        | Default bind, no flag needed   |
| MinIO      | 0.0.0.0:9000 | Yes        | S3 API + Console               |
| Neo4j      | 0.0.0.0:7687 | Yes        | Bolt + HTTP browser            |

## Verification

After starting the stack, verify IPv6 connectivity:

```bash
# Check services listen on IPv6
docker exec aacsearch-app sh -c "netstat -lnp | grep :::3000"

# Test IPv6 from outside (if host has public IPv6)
curl -6 http://[YOUR_IPV6_ADDRESS]:3000/api/health

# Verify Docker network has IPv6
docker network inspect aacsearch_internal | grep -A 2 'IPv6\|Subnet\|Gateway'
```

## Notes

- All internal service-to-service communication uses Docker DNS (`app`, `postgres`,
  `typesense`, `minio`), not IP addresses, so no code changes are needed.
- The Node.js Next.js server already binds to `0.0.0.0` (dual-stack by default
  on Docker with `enable_ipv6: true`).
- Application URL config (`NEXT_PUBLIC_SAAS_URL`, etc.) should use domain names,
  not raw IPs, to avoid IPv4/IPv6 ambiguity.
- If deploying behind a reverse proxy (nginx, Caddy, Traefik), ensure the proxy
  is also configured for dual-stack.
- Coolify: Enable IPv6 in Coolify's server settings → Network → IPv6.
