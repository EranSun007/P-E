# Architecture Research: Entity Model Editor

**Domain:** Visual database schema management tool
**Researched:** 2026-01-29
**Mode:** Integration architecture for existing P&E Manager codebase
**Confidence:** HIGH

## Executive Summary

The Entity Model Editor integrates into the existing P&E Manager architecture as a new feature area under Settings. It follows the established patterns: PostgreSQL backend with service classes, REST routes, and React frontend with Context providers. The key integration challenge is schema introspection - querying PostgreSQL's information_schema to visualize current database structure and generate migrations for schema changes.

**Key architectural decisions:**
1. **Data storage:** New `entity_models` table for storing target schema definitions
2. **Introspection:** Backend service queries information_schema for current state
3. **Visualization:** React components render tables as boxes with relationship lines
4. **Migration generation:** Generate SQL files (not execute directly) for safety
5. **Integration:** Add "Schema" tab to Settings page

## Integration with Existing Architecture

### Current Architecture Pattern

The P&E Manager follows a clean three-tier architecture:

```
Frontend (React + Vite)         Backend (Express.js)           Database (PostgreSQL)
+------------------------+      +------------------------+      +-------------------+
| src/pages/*.jsx        |      | server/routes/*.js     |      | Tables (27+)      |
| src/contexts/*.jsx     | ---> | server/services/*.js   | ---> | migrations table  |
| src/api/apiClient.js   |      | server/db/connection.js|      | information_schema|
| src/components/**      |      | server/db/migrate.js   |      |                   |
+------------------------+      +------------------------+      +-------------------+
```

### Integration Points

| Existing Component | How Entity Editor Integrates |
|-------------------|------------------------------|
| `server/db/connection.js` | Reuse for introspection queries |
| `server/db/migrate.js` | Generate new migrations (file output) |
| `src/pages/Settings.jsx` | Add new "Schema" tab |
| `src/api/apiClient.js` | Add EntityModel client |
| `server/routes/*.js` | Add schema route |
| `server/services/*.js` | Add SchemaService |

### Why This Integration Approach

1. **Consistency**: Follows established service/route/context patterns
2. **Reuse**: Leverages existing database connection pool
3. **Location**: Settings is the natural home for schema management
4. **Security**: Uses existing auth middleware

## New Components Needed

### Backend

#### 1. SchemaService (`server/services/SchemaService.js`)

Core service for schema introspection and model management.

**Responsibilities:**
- Query PostgreSQL information_schema for current tables/columns/relationships
- Store target entity model definitions
- Compare current vs target schema
- Generate migration SQL

**Key Methods:**
```javascript
class SchemaService {
  // Introspection - READ ONLY, no user_id needed
  async introspectSchema()           // Get all tables, columns, indexes
  async introspectTable(tableName)   // Get single table details
  async introspectRelationships()    // Get foreign key relationships

  // Entity Model CRUD - user_id scoped
  async listEntityModels(userId)     // Get user's saved models
  async getEntityModel(userId, id)   // Get single model
  async createEntityModel(userId, data)
  async updateEntityModel(userId, id, updates)
  async deleteEntityModel(userId, id)

  // Comparison & Generation
  async compareSchemas(currentSchema, targetModel)
  async generateMigration(userId, modelId, migrationName)
  async previewMigration(userId, modelId)  // Dry run
}
```

**PostgreSQL Introspection Queries:**

```sql
-- Get all tables
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';

-- Get columns for a table
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable,
  character_maximum_length,
  numeric_precision,
  numeric_scale
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = $1
ORDER BY ordinal_position;

-- Get foreign key relationships
SELECT
  tc.table_name AS source_table,
  kcu.column_name AS source_column,
  ccu.table_name AS target_table,
  ccu.column_name AS target_column,
  tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public';

-- Get indexes
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public';

-- Get primary keys
SELECT
  tc.table_name,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'PRIMARY KEY'
  AND tc.table_schema = 'public';
```

#### 2. Database Tables (`server/db/028_entity_model_editor.sql`)

**entity_models table:**
```sql
CREATE TABLE IF NOT EXISTS entity_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  version INTEGER DEFAULT 1,
  entities JSONB NOT NULL DEFAULT '[]',
  relationships JSONB NOT NULL DEFAULT '[]',
  layout JSONB DEFAULT '{}',  -- Store visual positions
  is_active BOOLEAN DEFAULT false,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_entity_models_user_id ON entity_models(user_id);
CREATE INDEX IF NOT EXISTS idx_entity_models_name ON entity_models(name);

-- Trigger for auto-updating updated_date
DROP TRIGGER IF EXISTS update_entity_models_updated_date ON entity_models;
CREATE TRIGGER update_entity_models_updated_date
  BEFORE UPDATE ON entity_models
  FOR EACH ROW EXECUTE FUNCTION update_updated_date_column();
```

**entity_model_migrations table (optional - track generated migrations):**
```sql
CREATE TABLE IF NOT EXISTS entity_model_migrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  model_id UUID REFERENCES entity_models(id) ON DELETE CASCADE,
  migration_name VARCHAR(255) NOT NULL,
  sql_content TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',  -- pending, applied, failed
  applied_at TIMESTAMP,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_emm_user_id ON entity_model_migrations(user_id);
CREATE INDEX IF NOT EXISTS idx_emm_model_id ON entity_model_migrations(model_id);
```

#### 3. Routes (`server/routes/schema.js`)

```javascript
// Schema introspection (read-only, admin only recommended)
GET  /api/schema/introspect              // Full schema
GET  /api/schema/introspect/:table       // Single table
GET  /api/schema/relationships           // FK relationships

// Entity Model CRUD
GET    /api/schema/models                // List user's models
GET    /api/schema/models/:id            // Get single model
POST   /api/schema/models                // Create model
PUT    /api/schema/models/:id            // Update model
DELETE /api/schema/models/:id            // Delete model

// Comparison & Migration
POST   /api/schema/models/:id/compare    // Compare to current schema
POST   /api/schema/models/:id/preview    // Preview migration SQL
POST   /api/schema/models/:id/generate   // Generate migration file
```

### Frontend

#### 1. New Settings Tab or Page

Main UI for the visual editor. Two placement options:

**Option A: Settings Tab (Recommended for MVP)**
- Add "Schema" tab to existing Settings.jsx
- Consistent with other configuration
- Uses existing tab infrastructure

**Option B: Standalone Page**
- `/EntityModelEditor` route
- More space for complex visualization
- Better for full-featured editor

**Structure:**
```jsx
// Main layout
<EntityModelEditor>
  <Toolbar>           // Model selection, save, generate migration
  <CanvasArea>        // Visual canvas for entity boxes
  <PropertiesPanel>   // Edit selected entity/field details
  <ComparisonPanel>   // Show diff between current and target
</EntityModelEditor>
```

#### 2. Context (`src/contexts/EntityModelContext.jsx`)

Manages entity model state for the editor.

```jsx
const EntityModelContext = React.createContext(null);

function EntityModelProvider({ children }) {
  // Current schema from introspection
  const [currentSchema, setCurrentSchema] = useState(null);

  // Target model being edited
  const [targetModel, setTargetModel] = useState(null);

  // Comparison results
  const [schemaDiff, setSchemaDiff] = useState(null);

  // Selection state for UI
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [selectedField, setSelectedField] = useState(null);

  // Actions
  const loadCurrentSchema = async () => { ... };
  const loadModel = async (modelId) => { ... };
  const saveModel = async () => { ... };
  const compareSchemas = async () => { ... };
  const generateMigration = async () => { ... };

  // Entity/Field CRUD (local state, not persisted until save)
  const addEntity = (entity) => { ... };
  const updateEntity = (entityId, updates) => { ... };
  const deleteEntity = (entityId) => { ... };
  const addField = (entityId, field) => { ... };
  const updateField = (entityId, fieldId, updates) => { ... };
  const deleteField = (entityId, fieldId) => { ... };
  const addRelationship = (relationship) => { ... };
  const deleteRelationship = (relationshipId) => { ... };

  return (
    <EntityModelContext.Provider value={{
      currentSchema, targetModel, schemaDiff,
      selectedEntity, selectedField,
      loadCurrentSchema, loadModel, saveModel,
      compareSchemas, generateMigration,
      addEntity, updateEntity, deleteEntity,
      addField, updateField, deleteField,
      addRelationship, deleteRelationship,
      setSelectedEntity, setSelectedField
    }}>
      {children}
    </EntityModelContext.Provider>
  );
}
```

#### 3. API Client Addition (`src/api/apiClient.js`)

```javascript
// Add to apiClient.entities
EntityModel: {
  ...createEntityClient('/schema/models'),

  async introspect() {
    return fetchWithAuth(`${API_BASE_URL}/schema/introspect`);
  },

  async introspectTable(tableName) {
    return fetchWithAuth(`${API_BASE_URL}/schema/introspect/${tableName}`);
  },

  async getRelationships() {
    return fetchWithAuth(`${API_BASE_URL}/schema/relationships`);
  },

  async compare(modelId) {
    return fetchWithAuth(`${API_BASE_URL}/schema/models/${modelId}/compare`, {
      method: 'POST'
    });
  },

  async previewMigration(modelId) {
    return fetchWithAuth(`${API_BASE_URL}/schema/models/${modelId}/preview`, {
      method: 'POST'
    });
  },

  async generateMigration(modelId, migrationName) {
    return fetchWithAuth(`${API_BASE_URL}/schema/models/${modelId}/generate`, {
      method: 'POST',
      body: JSON.stringify({ migrationName })
    });
  }
}
```

#### 4. Components (`src/components/schema/`)

| Component | Purpose |
|-----------|---------|
| `EntityBox.jsx` | Visual representation of a table |
| `FieldRow.jsx` | Single field within an entity box |
| `RelationshipLine.jsx` | FK connection line between entities |
| `EntityForm.jsx` | Form to add/edit entity |
| `FieldForm.jsx` | Form to add/edit field |
| `SchemaCanvas.jsx` | Main canvas with drag/drop |
| `SchemaDiff.jsx` | Shows comparison between schemas |
| `MigrationPreview.jsx` | Shows generated SQL |
| `ModelSelector.jsx` | Dropdown to switch between saved models |

## Data Flow

### Flow 1: Visualizing Current Schema

```
User opens Entity Editor
         |
         v
EntityModelContext.loadCurrentSchema()
         |
         v
apiClient.EntityModel.introspect()
         |
         v
GET /api/schema/introspect
         |
         v
SchemaService.introspectSchema()
         |
         v
PostgreSQL information_schema queries
         |
         v
Returns: { tables: [...], columns: {...}, relationships: [...] }
         |
         v
Context updates currentSchema state
         |
         v
SchemaCanvas renders EntityBox for each table
```

### Flow 2: Defining Target Model

```
User creates/edits entity model
         |
         v
Local state changes in EntityModelContext
(addEntity, updateEntity, addField, etc.)
         |
         v
User clicks "Save"
         |
         v
EntityModelContext.saveModel()
         |
         v
apiClient.EntityModel.create() or .update()
         |
         v
POST/PUT /api/schema/models/:id
         |
         v
SchemaService.createEntityModel() or .updateEntityModel()
         |
         v
INSERT/UPDATE entity_models table
```

### Flow 3: Generating Migration

```
User clicks "Generate Migration"
         |
         v
EntityModelContext.generateMigration()
         |
         v
apiClient.EntityModel.generateMigration(modelId, name)
         |
         v
POST /api/schema/models/:id/generate
         |
         v
SchemaService.generateMigration()
         |
    +----+----+
    |         |
    v         v
Compare    Generate
current    SQL DDL
schema     statements
    |         |
    +----+----+
         |
         v
Write to server/db/XXX_[name].sql
         |
         v
Returns: { filename, sql, changes: [...] }
         |
         v
User manually adds to migrate.js MIGRATIONS array
```

## Data Model for Entity Definitions

### TypeScript Interfaces (for reference)

```typescript
// Entity Model (stored in entity_models.entities JSONB)
interface Entity {
  id: string;           // UUID
  name: string;         // Table name (snake_case)
  displayName: string;  // Human-readable name
  description?: string;
  fields: Field[];
  position: { x: number; y: number };  // For visual layout
}

interface Field {
  id: string;           // UUID
  name: string;         // Column name (snake_case)
  displayName: string;  // Human-readable name
  type: FieldType;      // 'uuid' | 'varchar' | 'text' | 'integer' | etc.
  length?: number;      // For varchar
  precision?: number;   // For numeric
  scale?: number;       // For numeric
  nullable: boolean;
  defaultValue?: string;
  isPrimaryKey: boolean;
  isUnique: boolean;
  description?: string;
}

// Relationship (stored in entity_models.relationships JSONB)
interface Relationship {
  id: string;
  sourceEntityId: string;
  sourceFieldId: string;
  targetEntityId: string;
  targetFieldId: string;
  onDelete: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  onUpdate: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
}

// Supported PostgreSQL types
type FieldType =
  | 'uuid'
  | 'varchar'
  | 'text'
  | 'integer'
  | 'bigint'
  | 'numeric'
  | 'boolean'
  | 'timestamp'
  | 'date'
  | 'time'
  | 'jsonb'
  | 'text[]'    // Array types
  | 'integer[]';
```

### Introspection Result Structure

```javascript
// Result from GET /api/schema/introspect
{
  tables: [
    {
      name: 'tasks',
      columns: [
        {
          name: 'id',
          type: 'uuid',
          nullable: false,
          default: 'uuid_generate_v4()',
          isPrimaryKey: true
        },
        {
          name: 'user_id',
          type: 'varchar',
          length: 255,
          nullable: false
        },
        // ...
      ],
      indexes: [
        { name: 'idx_tasks_user_id', columns: ['user_id'] },
        // ...
      ]
    },
    // ... more tables
  ],
  relationships: [
    {
      sourceTable: 'comments',
      sourceColumn: 'task_id',
      targetTable: 'tasks',
      targetColumn: 'id',
      constraintName: 'comments_task_id_fkey',
      onDelete: 'CASCADE'
    },
    // ...
  ]
}
```

## Build Order

Suggested implementation sequence based on dependencies:

### Phase 1: Backend Foundation (Must come first)

1. **Migration file** (`028_entity_model_editor.sql`)
   - Creates entity_models table
   - No dependencies

2. **SchemaService** (`server/services/SchemaService.js`)
   - Depends on: db/connection.js (exists)
   - Introspection methods first
   - CRUD methods second

3. **Schema Routes** (`server/routes/schema.js`)
   - Depends on: SchemaService
   - Mount in server/index.js

### Phase 2: Frontend Data Layer

4. **API Client Extension** (`src/api/apiClient.js`)
   - Add EntityModel client
   - Depends on: Schema routes (backend)

5. **EntityModelContext** (`src/contexts/EntityModelContext.jsx`)
   - Depends on: API client extension

### Phase 3: Visual Components

6. **Basic Components** (no visual editor yet)
   - `EntityForm.jsx` - Add/edit entity
   - `FieldForm.jsx` - Add/edit field
   - `SchemaDiff.jsx` - Show comparison

7. **Canvas Components** (visual editor)
   - `SchemaCanvas.jsx` - Main canvas
   - `EntityBox.jsx` - Table visualization
   - `RelationshipLine.jsx` - FK lines

### Phase 4: Integration

8. **Settings Integration**
   - Add "Schema" tab to Settings.jsx
   - Or create standalone EntityModelEditor page

9. **Migration Generation**
   - SchemaService.generateMigration()
   - MigrationPreview component

### Dependency Graph

```
Migration SQL (028_...)
      |
      v
SchemaService
      |
      v
Schema Routes  ---------> server/index.js mount
      |
      v
API Client extension
      |
      v
EntityModelContext
      |
      +----------------+
      |                |
      v                v
Basic Components    Canvas Components
      |                |
      +-------+--------+
              |
              v
      Settings Integration
              |
              v
      Migration Generation
```

## Patterns to Follow

### Follow Existing Service Pattern

```javascript
// Match existing service structure (see TaskService.js)
import { query } from '../db/connection.js';

class SchemaService {
  async introspectSchema() {
    try {
      // Query logic
      const result = await query(sql, params);
      return result.rows;
    } catch (error) {
      console.error('SchemaService.introspectSchema error:', error);
      throw new Error('Failed to introspect schema');
    }
  }
}

export default new SchemaService();
```

### Follow Existing Route Pattern

```javascript
// Match existing route structure (see tasks.js)
import express from 'express';
import SchemaService from '../services/SchemaService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/introspect', async (req, res) => {
  try {
    const schema = await SchemaService.introspectSchema();
    res.json(schema);
  } catch (error) {
    console.error('GET /api/schema/introspect error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

### Follow Existing Context Pattern

```javascript
// Match existing context structure (see AppContext.jsx)
import React from 'react';
import { EntityModel } from '@/api/entities';
import { logger } from '@/utils/logger';

export const EntityModelContext = React.createContext(null);

export function EntityModelProvider({ children }) {
  const [currentSchema, setCurrentSchema] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const loadCurrentSchema = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await EntityModel.introspect();
      setCurrentSchema(data);
    } catch (err) {
      logger.error('Failed to load schema', { error: String(err) });
      setError('Failed to load schema');
    } finally {
      setLoading(false);
    }
  }, []);

  const value = React.useMemo(() => ({
    currentSchema, loading, error, loadCurrentSchema
  }), [currentSchema, loading, error, loadCurrentSchema]);

  return (
    <EntityModelContext.Provider value={value}>
      {children}
    </EntityModelContext.Provider>
  );
}
```

## Anti-Patterns to Avoid

### 1. Direct Schema Modification

**BAD:** Allowing direct ALTER TABLE execution from the UI
```javascript
// DON'T DO THIS - dangerous!
async executeRawSQL(sql) {
  return query(sql);  // SQL injection risk, no review
}
```

**GOOD:** Generate migration files for manual review
```javascript
// DO THIS - safe workflow
async generateMigration(modelId, name) {
  const sql = this.buildMigrationSQL(modelId);
  const filename = `${nextVersion}_${name}.sql`;
  await fs.writeFile(`server/db/${filename}`, sql);
  return { filename, sql, requiresManualReview: true };
}
```

### 2. Introspection Without Caching

**BAD:** Query information_schema on every render
```javascript
// DON'T DO THIS - expensive queries
useEffect(() => {
  introspect();  // Runs on every component mount
}, []);
```

**GOOD:** Load once, cache in context
```javascript
// DO THIS - load once, share via context
const { currentSchema, loadCurrentSchema } = useEntityModel();

useEffect(() => {
  if (!currentSchema) {
    loadCurrentSchema();  // Only if not cached
  }
}, [currentSchema, loadCurrentSchema]);
```

### 3. Losing Multi-Tenancy

**BAD:** Entity models without user_id filter
```javascript
// DON'T DO THIS - shows all users' models
async listModels() {
  return query('SELECT * FROM entity_models');
}
```

**GOOD:** Always filter by user_id
```javascript
// DO THIS - proper multi-tenancy
async listModels(userId) {
  return query(
    'SELECT * FROM entity_models WHERE user_id = $1',
    [userId]
  );
}
```

### 4. Over-Engineering Visual Canvas

**BAD:** Building complex drag-drop canvas from scratch
**GOOD:** Start with simple HTML/CSS tables, upgrade to React Flow if needed

## Technology Choices

### Visual Canvas Options

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **React Flow** | Full-featured, drag/drop, edges | Large bundle (~150kb), learning curve | Use if complex diagrams needed |
| **Custom SVG** | Lightweight, full control | More work, reinvent wheel | Use if simple layout only |
| **HTML/CSS Grid** | Simplest, native | Limited visual connections | Use for MVP |

**Recommendation:** Start with HTML/CSS for MVP, upgrade to React Flow if visual requirements grow. React Flow is proven and well-documented.

### Migration Generation Approach

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **File generation** | Safe, reviewable, git tracked | Manual migration step | Use this |
| **Direct execution** | Instant feedback | Dangerous, no review | Avoid |
| **Migration queue** | Middle ground | Complex state management | Overkill |

## Security Considerations

1. **Introspection is READ-ONLY**: No way to modify schema via introspection endpoints
2. **Migration generation writes files**: Does not execute SQL directly
3. **Admin-only recommended**: Consider role check for schema routes
4. **Parameterized queries**: All queries use prepared statements

```javascript
// Add role check if needed
router.use((req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
});
```

## Confidence Assessment

| Area | Level | Reasoning |
|------|-------|-----------|
| PostgreSQL introspection | HIGH | information_schema is well-documented, standard SQL |
| Service/route patterns | HIGH | Directly matches existing codebase (TaskService, tasks.js) |
| Context patterns | HIGH | Directly matches existing codebase (AppContext) |
| Migration generation | MEDIUM | Logic straightforward, edge cases in DDL generation |
| Visual canvas | MEDIUM | React Flow is proven, but adds complexity |
| Build order | HIGH | Clear dependency chain |

## Open Questions for Implementation

1. **Scope limitation**: Should we allow editing system tables (migrations, users) or lock them?
2. **Index management**: Include indexes in model, or handle separately?
3. **Trigger management**: Should generated migrations include triggers?
4. **Rollback support**: Generate DOWN migrations automatically?
5. **Model versioning**: Track model history or just latest state?

## Sources

### Primary (HIGH confidence)
- `/Users/i306072/Documents/GitHub/P-E/server/services/TaskService.js` - Service pattern
- `/Users/i306072/Documents/GitHub/P-E/server/routes/tasks.js` - Route pattern
- `/Users/i306072/Documents/GitHub/P-E/server/db/connection.js` - Database connection
- `/Users/i306072/Documents/GitHub/P-E/server/db/migrate.js` - Migration pattern
- `/Users/i306072/Documents/GitHub/P-E/src/contexts/AppContext.jsx` - Context pattern
- `/Users/i306072/Documents/GitHub/P-E/src/api/apiClient.js` - API client pattern
- `/Users/i306072/Documents/GitHub/P-E/src/pages/Settings.jsx` - Settings integration point

### Secondary (MEDIUM confidence)
- `/Users/i306072/Documents/GitHub/P-E/server/db/schema.sql` - Database structure reference
- PostgreSQL information_schema documentation - Standard SQL, well-known

### Tertiary (LOW confidence)
- React Flow library - Would need Context7 verification for current API

## Summary

The Entity Model Editor integrates cleanly into P&E Manager by:

1. Adding a new service (SchemaService) for introspection and model management
2. Adding REST routes following existing patterns
3. Storing entity models in a new PostgreSQL table
4. Providing a React context for editor state
5. Generating migration files (not executing directly) for safety

The build order ensures each phase has its dependencies satisfied. The approach maintains multi-tenancy, follows existing code patterns, and prioritizes safety by generating reviewable migration files rather than executing DDL directly.
