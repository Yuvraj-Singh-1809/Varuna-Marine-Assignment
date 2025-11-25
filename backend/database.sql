-- Database: fueleu_db

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

-- Seed Data
INSERT INTO routes (route_id, vessel_type, fuel_type, year, ghg_intensity, fuel_consumption, distance, total_emissions, is_baseline) VALUES
('R001', 'Container', 'HFO', 2024, 91.0, 5000, 12000, 4500, FALSE),
('R002', 'BulkCarrier', 'LNG', 2024, 88.0, 4800, 11500, 4200, FALSE),
('R003', 'Tanker', 'MGO', 2024, 93.5, 5100, 12500, 4700, FALSE),
('R004', 'RoRo', 'HFO', 2025, 89.2, 4900, 11800, 4300, FALSE),
('R005', 'Container', 'LNG', 2025, 90.5, 4950, 11900, 4400, FALSE);