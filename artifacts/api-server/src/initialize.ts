import { initializeReference } from "./lib/seed";
import { pool } from "@workspace/db";
import { logger } from "./lib/logger";
await initializeReference();
logger.info("Reference example initialized without changing existing simulations");
await pool.end();
