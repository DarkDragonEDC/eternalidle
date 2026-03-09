import fs from 'fs';

const detailedSchema = JSON.parse(fs.readFileSync('production_full_schema_detailed.json', 'utf8'));

let sql = `-- DATABASE REPAIR SCRIPT: RESTORE PRIMARY KEYS AND CONSTRAINTS
-- This script adds missing PKeys and other constraints to the staging database.

`;

// Process tables to find potential Primary Keys (usually column 'id')
for (const [tableName, columns] of Object.entries(detailedSchema.tables)) {
    const hasId = columns.some(c => c.column_name === 'id');
    const hasUserId = columns.some(c => c.column_name === 'user_id');
    
    // We'll focus on 'id' first as it's the standard PKey in this project
    if (hasId) {
        sql += `ALTER TABLE public."${tableName}" DROP CONSTRAINT IF EXISTS "${tableName}_pkey" CASCADE;\n`;
        sql += `ALTER TABLE public."${tableName}" ADD PRIMARY KEY ("id");\n\n`;
    } else if (tableName === 'daily_rewards' && hasUserId) {
        // Special case for tables without 'id'
        sql += `ALTER TABLE public."${tableName}" DROP CONSTRAINT IF EXISTS "${tableName}_pkey" CASCADE;\n`;
        sql += `ALTER TABLE public."${tableName}" ADD PRIMARY KEY ("user_id");\n\n`;
    }
}

// Re-add Foreign Keys to ensure everything is linked
sql += `-- Restore Foreign Keys\n`;
for (const fk of detailedSchema.foreignKeys) {
    sql += `ALTER TABLE public."${fk.table_name}" DROP CONSTRAINT IF EXISTS "${fk.table_name}_${fk.column_name}_fkey" CASCADE;\n`;
    sql += `ALTER TABLE public."${fk.table_name}" \n`;
    sql += `    ADD CONSTRAINT "${fk.table_name}_${fk.column_name}_fkey" \n`;
    sql += `    FOREIGN KEY ("${fk.column_name}") REFERENCES public."${fk.foreign_table_name}"("${fk.foreign_column_name}") ON DELETE CASCADE;\n\n`;
}

fs.writeFileSync('sql/repair_staging_keys.sql', sql);
console.log("SUCCESS: Generated sql/repair_staging_keys.sql");
