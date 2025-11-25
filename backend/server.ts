import express, { Request, Response } from 'express';
import { Pool } from 'pg';
import cors from 'cors';

// ==========================================
// CORE: DOMAIN (No Framework Dependencies)
// ==========================================

// Domain Entities
export interface Route {
    id: number;
    routeId: string;
    vesselType: string;
    fuelType: string;
    year: number;
    ghgIntensity: number;
    fuelConsumption: number;
    distance: number;
    totalEmissions: number;
    isBaseline: boolean;
}

export interface BankEntry {
    id?: number;
    routeId: string;
    year: number;
    type: 'banked' | 'applied';
    amount: number;
    createdAt?: Date;
}

export interface ComplianceResult {
    cb: number;
    banked: number;
    adjustedCB: number;
}

export const CONSTANTS = {
    GHG_TARGET_2025: 89.3368,
    LCV: 41000, // MJ/t
};

// Domain Logic (Use Cases)
export class ComplianceService {
    constructor(
        private routeRepo: RouteRepositoryPort,
        private bankingRepo: BankingRepositoryPort
    ) {}

    async calculateCB(routeId: string, year: number): Promise<ComplianceResult> {
        const route = await this.routeRepo.findByRouteId(routeId);
        if (!route) throw new Error('Route not found');

        // Core Formula: CB = (Target - Actual) * Energy
        const energyInScope = route.fuelConsumption * CONSTANTS.LCV;
        const cb = (CONSTANTS.GHG_TARGET_2025 - route.ghgIntensity) * energyInScope;

        const bankEntries = await this.bankingRepo.findByRouteId(routeId);
        const bankedSum = bankEntries
            .filter(e => e.type === 'banked')
            .reduce((sum, e) => sum + Number(e.amount), 0);
        const appliedSum = bankEntries
            .filter(e => e.type === 'applied')
            .reduce((sum, e) => sum + Number(e.amount), 0);

        const netBanked = bankedSum - appliedSum;

        return {
            cb,
            banked: netBanked,
            adjustedCB: cb + netBanked
        };
    }

    async bankSurplus(routeId: string, year: number): Promise<BankEntry> {
        const status = await this.calculateCB(routeId, year);
        if (status.cb <= 0) throw new Error('Cannot bank negative compliance balance');

        const entry: BankEntry = {
            routeId,
            year,
            type: 'banked',
            amount: status.cb
        };
        return await this.bankingRepo.save(entry);
    }
}

// ==========================================
// PORTS (Interfaces)
// ==========================================

export interface RouteRepositoryPort {
    findAll(): Promise<Route[]>;
    findByRouteId(id: string): Promise<Route | null>;
    setBaseline(id: number): Promise<void>;
    getBaseline(year: number): Promise<Route | null>;
}

export interface BankingRepositoryPort {
    findByRouteId(id: string): Promise<BankEntry[]>;
    save(entry: BankEntry): Promise<BankEntry>;
}

// ==========================================
// ADAPTERS: INFRASTRUCTURE (Postgres)
// ==========================================

class PostgresRouteAdapter implements RouteRepositoryPort {
    constructor(private db: Pool) {}

    async findAll(): Promise<Route[]> {
        const res = await this.db.query('SELECT * FROM routes ORDER BY route_id');
        return res.rows.map(this.mapRowToRoute);
    }

    async findByRouteId(id: string): Promise<Route | null> {
        const res = await this.db.query('SELECT * FROM routes WHERE route_id = $1', [id]);
        return res.rows.length ? this.mapRowToRoute(res.rows[0]) : null;
    }

    async setBaseline(id: number): Promise<void> {
        // Transaction to ensure only one baseline per year
        const client = await this.db.connect();
        try {
            await client.query('BEGIN');
            // Get year of the requested route
            const routeRes = await client.query('SELECT year FROM routes WHERE id = $1', [id]);
            if (routeRes.rows.length === 0) throw new Error('Route not found');
            
            const year = routeRes.rows[0].year;
            
            // Reset others in same year
            await client.query('UPDATE routes SET is_baseline = FALSE WHERE year = $1', [year]);
            // Set new baseline
            await client.query('UPDATE routes SET is_baseline = TRUE WHERE id = $1', [id]);
            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }

    async getBaseline(year: number): Promise<Route | null> {
        const res = await this.db.query('SELECT * FROM routes WHERE is_baseline = TRUE AND year = $1', [year]);
        return res.rows.length ? this.mapRowToRoute(res.rows[0]) : null;
    }

    private mapRowToRoute(row: any): Route {
        return {
            id: row.id,
            routeId: row.route_id,
            vesselType: row.vessel_type,
            fuelType: row.fuel_type,
            year: row.year,
            ghgIntensity: parseFloat(row.ghg_intensity),
            fuelConsumption: parseFloat(row.fuel_consumption),
            distance: parseFloat(row.distance),
            totalEmissions: parseFloat(row.total_emissions),
            isBaseline: row.is_baseline
        };
    }
}

class PostgresBankingAdapter implements BankingRepositoryPort {
    constructor(private db: Pool) {}

    async findByRouteId(id: string): Promise<BankEntry[]> {
        const res = await this.db.query('SELECT * FROM bank_entries WHERE route_id = $1', [id]);
        return res.rows.map(row => ({
            id: row.id,
            routeId: row.route_id,
            year: row.year,
            type: row.type,
            amount: parseFloat(row.amount_gco2eq),
            createdAt: row.created_at
        }));
    }

    async save(entry: BankEntry): Promise<BankEntry> {
        const res = await this.db.query(
            'INSERT INTO bank_entries (route_id, year, type, amount_gco2eq) VALUES ($1, $2, $3, $4) RETURNING *',
            [entry.routeId, entry.year, entry.type, entry.amount]
        );
        return res.rows[0];
    }
}

// ==========================================
// ADAPTERS: UI (Express API)
// ==========================================

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