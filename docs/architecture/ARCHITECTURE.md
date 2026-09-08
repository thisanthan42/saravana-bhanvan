# Architecture Overview: Saravana Bhavan Customer Feedback SaaS

## 1. System Topology
The platform implements a decoupled, high-performance client-server architecture:
1. **Frontend (React 18 + Vite 6 + Tailwind CSS):** Single-page application serving customer feedback forms, manager portal, and Super Admin control center.
2. **Backend (Node.js + Express 4):** REST API providing rate limiting, Scrypt auth, JWT issuance, anti-abuse guards, and cryptographic QR token resolution.
3. **Database (PostgreSQL + Pool):** Relational schema supporting multi-branch dining, managers, and immutable audit logs.
