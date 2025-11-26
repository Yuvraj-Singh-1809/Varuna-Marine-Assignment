# FuelEU Maritime Compliance Platform

A full-stack application for tracking FuelEU Maritime regulation compliance, featuring **Route management**, **GHG intensity comparison**, **Banking**, and **Pooling** mechanisms.

---

## **Architecture**
This project follows **Hexagonal Architecture (Ports & Adapters)** to decouple core domain logic from UI and infrastructure layers.

### **Structure Overview**
- **Core (Domain)**
  - Business rules: `calculateComplianceBalance`, `validatePool`
  - Domain Entities: `Route`, `Pool`
- **Ports**
  - Interfaces for data access (`RouteRepository`)
  - Service interface for UI interaction (`ComplianceService`)
- **Adapters**
  - **Driven (Infrastructure)**: PostgreSQL repository implementations
  - **Driving (UI)**: Express REST API & React frontend

---

## **Setup Instructions**
### **Prerequisites**
- Node.js **v18+**
- PostgreSQL **v14+**

### **Database Setup**
1. Create database: `fueleu_db`
2. Run SQL initialization script located at `backend/database.sql`

---

## **Backend Setup**
```bash
cd backend
npm install
npm run dev
# Server runs at http://localhost:3000
```

## **Frontend Setup**
```bash
cd frontend
npm install
npm run dev
# Application available at http://localhost:5173
```

---

## **Testing**
```bash
npm test
```

---

## **API Endpoints**
| Method | Endpoint | Description |
|--------|-----------|-------------|
| GET | `/routes` | Fetch all vessel routes |
| POST | `/routes/:id/baseline` | Set a route as the baseline |
| GET | `/compliance/cb` | Calculate Compliance Balance |
| POST | `/banking/bank` | Bank surplus balance |
| POST | `/pools` | Create a compliance pool |

---

