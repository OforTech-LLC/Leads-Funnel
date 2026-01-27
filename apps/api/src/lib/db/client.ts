/**
 * Shared DynamoDB Document Client
 *
 * Re-exports from the centralized clients module so that all db/*
 * modules continue to import from this path without change.
 */

export { getDocClient, tableName } from '../clients.js';
