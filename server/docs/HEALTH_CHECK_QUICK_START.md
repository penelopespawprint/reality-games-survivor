# Health Check Quick Start

## Usage

### Simple Health Check (for monitoring)

```bash
curl https://rgfl-api-production.up.railway.app/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-27T12:00:00.000Z"
}
```

---

### Detailed Health Check (for diagnostics)

```bash
curl "https://rgfl-api-production.up.railway.app/health?detailed=true"
```

**Response (healthy):**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-27T12:00:00.000Z",
  "checks": {
    "database": {
      "status": "pass",
      "latency": 45,
      "details": {
        "message": "Database connection healthy"
      }
    },
    "scheduler": {
      "status": "pass",
      "running": true,
      "jobCount": 7,
      "details": {
        "message": "Scheduler running with 7 enabled jobs",
        "jobs": [...]
      }
    },
    "recentJobFailures": {
      "status": "pass",
      "count": 0
    }
  }
}
```

---

## Pretty Print with jq

```bash
curl -s "https://rgfl-api-production.up.railway.app/health?detailed=true" | jq
```

---

## Check Specific Components

### Database Latency
```bash
curl -s "https://rgfl-api-production.up.railway.app/health?detailed=true" | \
  jq '.checks.database'
```

### Scheduler Status
```bash
curl -s "https://rgfl-api-production.up.railway.app/health?detailed=true" | \
  jq '.checks.scheduler'
```

### Recent Job Failures
```bash
curl -s "https://rgfl-api-production.up.railway.app/health?detailed=true" | \
  jq '.checks.recentJobFailures'
```

---

## Integration Examples

### Uptime Robot
```
Monitor URL: https://rgfl-api-production.up.railway.app/health
Monitor Type: HTTP(s)
Keyword Monitoring: "ok"
Alert Contacts: admin@rgfl.app
Check Interval: 5 minutes
```

### Kubernetes Liveness Probe
```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3001
  periodSeconds: 10
```

### Load Balancer Health Check
```nginx
location /health {
  proxy_pass http://backend/health;
  proxy_connect_timeout 2s;
}
```

---

## Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Healthy or degraded | Normal operation |
| 503 | Unhealthy | Alert, investigate immediately |

---

## Component Status Values

| Status | Meaning |
|--------|---------|
| `pass` | Component healthy |
| `warn` | Component degraded but operational |
| `fail` | Component failed, service impacted |

---

## Troubleshooting

### Database slow (warn)
- Latency between 500ms - 2000ms
- Check database load and query performance

### Database failed (fail)
- Latency >= 2000ms or connection error
- Check database service status and connectivity

### Scheduler not running
- `ENABLE_SCHEDULER` not set to `true`
- Scheduler crashed during initialization

### Job failures detected
- Check `lastFailure` for error details
- Investigate affected job
- Review job monitoring logs

---

For full documentation, see [HEALTH_CHECK.md](./HEALTH_CHECK.md)
