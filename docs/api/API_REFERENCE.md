# REST API Reference

## Public Endpoints
- `GET /api`: Operational status and discovery
- `GET /api/health`: System & database health check
- `POST /api/public/session`: Initiates feedback submission session
- `GET /api/public/qr/:token`: Safe dining context resolution
- `POST /api/feedback`: Submit guest dining feedback

## Manager Endpoints (Protected by JWT)
- `POST /api/manager/login`: Authenticate with email and password
- `GET /api/manager/me`: Fetch authenticated manager profile
- `GET /api/manager/feedback`: Paginated feedback records
- `GET /api/manager/feedback/:id`: Single feedback detail
- `GET /api/manager/qr`: List branch table QR codes
- `POST /api/manager/qr`: Generate table QR code
- `PATCH /api/manager/qr/:id/status`: Toggle QR code status

## Super Admin Endpoints (Protected by Super Admin JWT)
- `GET /api/admin/overview`: 8 calculated KPI metrics
- `GET /api/admin/businesses`: List hotel businesses
- `GET /api/admin/branches`: List all branches
- `GET /api/admin/managers`: List all manager accounts
- `GET /api/admin/audit`: Chronological security audit logs
