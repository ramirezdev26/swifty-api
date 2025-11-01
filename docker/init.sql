-- Database initialization script for Swifty API
-- This file runs when the PostgreSQL container starts for the first time

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create database if it doesn't exist (this is handled by POSTGRES_DB env var, but keeping for reference)
-- SELECT 'CREATE DATABASE swifty_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'swifty_db')\gexec

-- Switch to swifty_db (this might not be needed since POSTGRES_DB sets it)
-- \c swifty_db;

-- Create any additional schemas or tables if needed
-- Add your custom initialization here

-- Example: Create a simple health check table (optional)
CREATE TABLE IF NOT EXISTS health_check (
    id SERIAL PRIMARY KEY,
    check_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'OK'
);

-- Insert initial health check record
INSERT INTO health_check (status) VALUES ('INITIALIZED') ON CONFLICT DO NOTHING;
