import express, { Request, Response } from 'express';
import { Pool } from 'pg';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Database Connection
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: 'Braj1374',
    port: 5432,
});

// -------------------------------------------
// AUTO-SEEDING LOGIC
// -------------------------------------------
const seedDatabase = async () => {
    try {
        // 1. Check if tables exist, create if not
        await pool.query(`
            CREATE TABLE IF NOT EXISTS routes (
                id SERIAL PRIMARY KEY,
                route_id VARCHAR(50) NOT NULL UNIQUE,
                vessel_type VARCHAR(50) NOT NULL,
                fuel_type VARCHAR(50) NOT NULL,
                year INT NOT NULL,
                ghg_intensity DECIMAL(10, 4) NOT NULL,
                fuel_consumption DECIMAL(10, 2) NOT NULL,
                distance DECIMAL(10, 2) NOT NULL,
                total_emissions DECIMAL(10, 2) NOT NULL,
                is_baseline BOOLEAN DEFAULT FALSE
            );
            CREATE TABLE IF NOT EXISTS bank_entries (
                id SERIAL PRIMARY KEY,
                route_id VARCHAR(50) REFERENCES routes(route_id),
                year INT NOT NULL,
                type VARCHAR(20) CHECK (type IN ('banked', 'applied')),
                amount_gco2eq DECIMAL(15, 2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS pools (
                id SERIAL PRIMARY KEY,
                year INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS pool_members (
                id SERIAL PRIMARY KEY,
                pool_id INT REFERENCES pools(id),
                route_id VARCHAR(50) REFERENCES routes(route_id),
                cb_before DECIMAL(15, 2) NOT NULL,
                cb_after DECIMAL(15, 2) NOT NULL
            );
        `);

        // 2. Check if data exists
        const res = await pool.query('SELECT COUNT(*) FROM routes');
        const count = parseInt(res.rows[0].count);

        if (count === 0) {
            console.log('Seeding database with initial data...');
            await pool.query(`
                INSERT INTO routes (route_id, vessel_type, fuel_type, year, ghg_intensity, fuel_consumption, distance, total_emissions, is_baseline) VALUES
                ('R001', 'Container', 'HFO', 2024, 91.0, 5000, 12000, 4500, FALSE),
                ('R002', 'BulkCarrier', 'LNG', 2024, 88.0, 4800, 11500, 4200, FALSE),
                ('R003', 'Tanker', 'MGO', 2024, 93.5, 5100, 12500, 4700, FALSE),
                ('R004', 'RoRo', 'HFO', 2025, 89.2, 4900, 11800, 4300, FALSE),
                ('R005', 'Container', 'LNG', 2025, 90.5, 4950, 11900, 4400, FALSE);
            `);
            console.log('Database seeded successfully.');
        } else {
            console.log('Database already contains data. Skipping seed.');
        }
    } catch (err) {
        console.error('Error seeding database:', err);
    }
};

// Dependency Injection
const routeRepo = new PostgresRouteAdapter(pool);
const bankingRepo = new PostgresBankingAdapter(pool);
const complianceService = new ComplianceService(routeRepo, bankingRepo);

// Routes
app.get('/routes', async (req, res) => {
    try {
        const routes = await routeRepo.findAll();
        res.json(routes);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/routes/:id/baseline', async (req, res) => {
    try {
        await routeRepo.setBaseline(parseInt(req.params.id));
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to set baseline' });
    }
});

app.get('/compliance/cb', async (req, res) => {
    try {
        const { routeId, year } = req.query;
        if (!routeId || !year) throw new Error("Missing params");
        const result = await complianceService.calculateCB(String(routeId), Number(year));
        res.json(result);
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

app.post('/banking/bank', async (req, res) => {
    try {
        const { routeId, year } = req.body;
        const entry = await complianceService.bankSurplus(routeId, year);
        res.json(entry);
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

// Start Server
if (require.main === module) {
    // Run seed before listening
    seedDatabase().then(() => {
        app.listen(3000, () => console.log('Backend running on port 3000'));
    });
}