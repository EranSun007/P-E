# Phase 33: Visual Canvas - Research

**Researched:** 2026-01-29
**Domain:** Interactive node-based graph visualization for database schemas
**Confidence:** HIGH

## Summary

Phase 33 requires building an interactive visual canvas to display database schema as a node graph. The standard approach uses **@xyflow/react** (formerly react-flow), a mature React library with 3.85M weekly downloads designed specifically for node-based editors and diagrams.

The implementation leverages existing schema introspection data from Phase 32's API (GET /api/schema/tables) and transforms it into nodes (entities with field lists) and edges (foreign key relationships). Users can pan, zoom, and click nodes to view detailed information.

**Primary recommendation:** Use @xyflow/react v12.x with custom node components for entity display, standard edge rendering for relationships, and built-in Controls/Background components for interaction.

## Standard Stack

The established libraries/tools for interactive node graphs in React:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @xyflow/react | 12.10.0 | Node-based UI rendering | Industry standard for React flow diagrams, 3.85M weekly downloads, built specifically for node editors |
| React 18 | 18.3.1 (existing) | UI framework | Already in project, peer dependency satisfied |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| dagre | 0.8.5 | Auto-layout algorithm | Optional - for automatic node positioning (static layout only) |
| elkjs | 0.9.x | Advanced layout engine | Alternative to dagre for complex schemas with better handling of large graphs |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @xyflow/react | vis-network | vis-network requires wrapper for React, manual handle management, less active development |
| @xyflow/react | react-force-graph | No connection handles, limited customization, physics-based only |
| @xyflow/react | jointjs | Commercial licensing concerns, less React-native |
| Auto-layout (dagre) | Manual positioning | Manual gives control but tedious for 13+ tables; dagre provides "good enough" starting point |

**Installation:**
```bash
npm install @xyflow/react
# Optional for auto-layout:
npm install dagre @types/dagre
```

## Architecture Patterns

### Recommended Project Structure
```
src/pages/
├── EntityModel.jsx              # Main page component with ReactFlow
src/components/schema/
├── EntityNode.jsx               # Custom node for table display
├── RelationshipEdge.jsx         # Optional custom edge for FK lines
├── SchemaCanvas.jsx             # ReactFlow wrapper with state
└── EntityDetailsPanel.jsx       # Click-to-view details sidebar
```

### Pattern 1: Data Transformation (API → Graph)
**What:** Transform schema API response into ReactFlow nodes/edges format
**When to use:** On page mount, when schema data loads
**Example:**
```javascript
// Source: Phase 32 API response format + React Flow docs
function transformSchemaToGraph(tables) {
  const nodes = tables.map((table, index) => ({
    id: table.name,
    type: 'entity', // Custom node type
    data: {
      tableName: table.name,
      columns: table.columns,
      foreignKeys: table.foreignKeys,
      constraints: table.constraints
    },
    position: { x: index * 250, y: index * 150 } // Temporary - replace with dagre
  }));

  const edges = [];
  tables.forEach(table => {
    table.foreignKeys?.forEach(fk => {
      edges.push({
        id: `${table.name}-${fk.constraintName}`,
        source: table.name,
        target: fk.referencedTable,
        type: 'smoothstep', // Built-in edge type
        label: fk.columns.join(', '),
        animated: false
      });
    });
  });

  return { nodes, edges };
}
```

### Pattern 2: Custom Node Component
**What:** React component displaying table as a box with field list
**When to use:** Register as nodeType, ReactFlow renders automatically
**Example:**
```jsx
// Source: https://reactflow.dev/examples/nodes/custom-node
import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

const EntityNode = memo(({ data }) => {
  return (
    <div className="bg-white border-2 border-gray-300 rounded-lg shadow-md min-w-[200px]">
      {/* Table header */}
      <div className="bg-blue-600 text-white px-3 py-2 font-semibold rounded-t-lg">
        {data.tableName}
      </div>

      {/* Column list */}
      <div className="p-2 max-h-[300px] overflow-y-auto">
        {data.columns.map(col => (
          <div key={col.name} className="flex items-center text-sm py-1 px-2">
            <span className={col.isPrimaryKey ? 'font-bold' : ''}>
              {col.name}
            </span>
            <span className="text-gray-500 ml-auto text-xs">
              {col.dataType}
            </span>
          </div>
        ))}
      </div>

      {/* Handles for connections - place on sides */}
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
});

export default EntityNode;
```

### Pattern 3: ReactFlow Setup with Controls
**What:** Main canvas component with pan/zoom controls
**When to use:** Page component structure
**Example:**
```jsx
// Source: https://reactflow.dev/api-reference/react-flow
import { ReactFlow, Controls, Background, useNodesState, useEdgesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import EntityNode from './EntityNode';

const nodeTypes = {
  entity: EntityNode
};

function SchemaCanvas({ tables }) {
  const { nodes, edges } = transformSchemaToGraph(tables);
  const [nodesState, setNodes, onNodesChange] = useNodesState(nodes);
  const [edgesState, setEdges, onEdgesChange] = useEdgesState(edges);

  const handleNodeClick = (event, node) => {
    console.log('Clicked node:', node);
    // Open details panel with node.data
  };

  return (
    <div style={{ width: '100%', height: '600px' }}>
      <ReactFlow
        nodes={nodesState}
        edges={edgesState}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.5}
        maxZoom={2}
      >
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
}
```

### Pattern 4: Auto-Layout with Dagre (Optional)
**What:** Automatically position nodes in hierarchical layout
**When to use:** Initial positioning, "Reset Layout" button
**Example:**
```javascript
// Source: https://reactflow.dev/examples/layout/dagre
import dagre from 'dagre';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

function getLayoutedElements(nodes, edges, direction = 'TB') {
  const nodeWidth = 200;
  const nodeHeight = 150;

  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2
      }
    };
  });

  return { nodes: layoutedNodes, edges };
}
```

### Anti-Patterns to Avoid
- **Anti-pattern: Using d3.js directly** - Too low-level when @xyflow/react exists specifically for this use case
- **Anti-pattern: Manual edge routing** - Let ReactFlow handle edge paths automatically
- **Anti-pattern: Real-time layout recalculation** - Dagre layout is static; recalculate only on user request or data reload
- **Anti-pattern: Deeply nested node data** - Keep node.data flat for better performance with many nodes

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Node dragging | Custom drag handlers | ReactFlow built-in | Handles snapping, constraints, performance optimization |
| Pan/zoom canvas | Canvas transform math | ReactFlow Controls component | Handles touch, mouse wheel, pinch zoom, keyboard shortcuts |
| Edge routing | Bezier curve calculations | ReactFlow edge types (smoothstep, bezier) | Handles connection points, arrow markers, labels |
| Minimap | Canvas thumbnail renderer | ReactFlow MiniMap component | Built-in component with viewport indicator |
| Connection validation | Manual FK checking | ReactFlow isValidConnection prop | Callback to prevent invalid connections |
| Node selection | Click handlers + state | ReactFlow selection handling | Multi-select, selection box, keyboard modifiers built-in |

**Key insight:** ReactFlow provides a complete node graph editing framework. Only customize rendering (nodes/edges appearance), not interaction mechanics.

## Common Pitfalls

### Pitfall 1: CSS Stylesheet Not Imported
**What goes wrong:** Nodes and controls render but are unstyled/invisible
**Why it happens:** @xyflow/react requires explicit CSS import
**How to avoid:**
```javascript
import '@xyflow/react/dist/style.css';
```
Add to top of component file or main App.jsx

**Warning signs:** Controls appear as text, no node borders, dragging doesn't work visually

### Pitfall 2: Parent Container Without Height
**What goes wrong:** Canvas doesn't render or renders with 0 height
**Why it happens:** ReactFlow requires explicit height on parent element
**How to avoid:**
```jsx
<div style={{ width: '100%', height: '600px' }}>
  <ReactFlow ... />
</div>
```
**Warning signs:** "ReactFlow needs a parent with a defined width and height" console warning

### Pitfall 3: Not Memoizing Node Components
**What goes wrong:** Performance degrades with many nodes, re-renders on every state change
**Why it happens:** React re-creates node components unnecessarily
**How to avoid:**
```javascript
import { memo } from 'react';
const EntityNode = memo(({ data }) => { ... });
```
**Warning signs:** Choppy dragging, slow zoom, high CPU usage

### Pitfall 4: Static Layout Assumptions
**What goes wrong:** Layout doesn't update when nodes/edges change
**Why it happens:** Dagre layout is static, doesn't recalculate automatically
**How to avoid:** Re-run getLayoutedElements() when data changes or add "Reset Layout" button
**Warning signs:** New tables appear at (0,0) overlapping, deleted tables leave gaps

### Pitfall 5: Not Using useNodesState/useEdgesState
**What goes wrong:** Nodes can't be dragged, selection doesn't work
**Why it happens:** ReactFlow needs controlled state with special handlers
**How to avoid:** Use ReactFlow hooks instead of useState:
```javascript
const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
```
**Warning signs:** Dragging nodes snaps back, can't select nodes

## Code Examples

Verified patterns from official sources:

### Loading Schema and Rendering Canvas
```jsx
// Source: Phase 32 API + https://reactflow.dev/learn
import { useState, useEffect } from 'react';
import { ReactFlow, Controls, Background, useNodesState, useEdgesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import EntityNode from '@/components/schema/EntityNode';

const nodeTypes = { entity: EntityNode };

function EntityModel() {
  const [loading, setLoading] = useState(true);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    async function loadSchema() {
      try {
        const response = await fetch('/api/schema/tables');
        const tables = await response.json();
        const { nodes: graphNodes, edges: graphEdges } = transformSchemaToGraph(tables);
        setNodes(graphNodes);
        setEdges(graphEdges);
      } catch (error) {
        console.error('Failed to load schema:', error);
      } finally {
        setLoading(false);
      }
    }
    loadSchema();
  }, []);

  const handleNodeClick = (event, node) => {
    setSelectedNode(node);
  };

  if (loading) return <div>Loading schema...</div>;

  return (
    <div className="flex gap-4 h-screen">
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          nodeTypes={nodeTypes}
          fitView
        >
          <Controls />
          <Background />
        </ReactFlow>
      </div>

      {selectedNode && (
        <div className="w-80 bg-white border-l p-4">
          <h2 className="text-lg font-bold">{selectedNode.data.tableName}</h2>
          {/* Details panel content */}
        </div>
      )}
    </div>
  );
}
```

### Identifying Primary Keys in Columns
```javascript
// Source: Phase 32 constraints structure
function enrichColumnsWithConstraints(columns, constraints) {
  const pkColumns = new Set(
    constraints.primaryKey?.columns || []
  );

  return columns.map(col => ({
    ...col,
    isPrimaryKey: pkColumns.has(col.columnName),
    isNullable: col.isNullable,
    dataType: col.dataType
  }));
}
```

### Navigation Integration
```jsx
// Source: Existing Layout.jsx navigation pattern
// Add to peopleNavigation array in Layout.jsx:
{
  name: "Entity Model",
  icon: Database, // Import from lucide-react
  href: createPageUrl("EntityModel"),
  current: currentPageName === "EntityModel"
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-flow | @xyflow/react | v12 (2024) | Package renamed, tree-shakeable, smaller bundle |
| Manual edge types | Built-in smoothstep/bezier | v11+ | Cleaner edges, less custom code |
| dagre-d3 | dagre (standalone) | 2020+ | No D3 dependency, just layout algorithm |
| Class components | Functional + hooks | v10+ | useNodesState, useEdgesState for state management |

**Deprecated/outdated:**
- **react-flow-renderer**: Old package name, use @xyflow/react
- **FlowElement type**: Replaced with Node and Edge types in v10+
- **removeElements helper**: Use applyNodeChanges/applyEdgeChanges instead

## Open Questions

Things that couldn't be fully resolved:

1. **Auto-layout performance with 13+ tables**
   - What we know: Dagre handles hundreds of nodes, P&E Manager has 13 tables
   - What's unclear: Whether auto-layout should run on every load or be opt-in
   - Recommendation: Run on initial load, provide "Reset Layout" button for re-layout

2. **Edge label positioning for multi-column FKs**
   - What we know: Foreign keys can reference multiple columns
   - What's unclear: Best way to display "col1, col2" labels without overlap
   - Recommendation: Use edge label prop, let ReactFlow handle positioning; truncate if >2 columns

3. **Node size with variable column counts**
   - What we know: Tables have 3-20 columns, affects node height
   - What's unclear: Fixed height with scroll vs. dynamic height
   - Recommendation: Max-height with overflow scroll (max-h-[300px]), prevents huge nodes

## Sources

### Primary (HIGH confidence)
- React Flow Official Docs: https://reactflow.dev/ - v12.10.0 documentation
- React Flow API Reference: https://reactflow.dev/api-reference/react-flow - Props and types
- React Flow Custom Nodes Guide: https://reactflow.dev/examples/nodes/custom-node
- React Flow Contextual Zoom Example: https://reactflow.dev/examples/interaction/contextual-zoom
- React Flow Layout Example (Dagre): https://reactflow.dev/examples/layout/dagre
- Phase 32 Schema API: /Users/i306072/Documents/GitHub/P-E/server/routes/schema.js

### Secondary (MEDIUM confidence)
- Existing research: .planning/research/STACK-entity-model-editor.md (HIGH confidence - project-specific)
- Existing research: .planning/research/FEATURES-entity-model-editor.md (HIGH confidence - feature scope)
- npm package stats: https://www.npmjs.com/package/@xyflow/react (3.85M weekly downloads verified)

### Tertiary (LOW confidence)
- None - all claims verified with authoritative sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - @xyflow/react is verified industry standard via npm stats, official docs
- Architecture: HIGH - Patterns verified from official React Flow documentation and examples
- Pitfalls: HIGH - Common issues documented in React Flow troubleshooting guide and GitHub issues

**Research date:** 2026-01-29
**Valid until:** 2026-03-01 (30 days for stable library, React Flow v12 is mature)

**Technology versions verified:**
- @xyflow/react: 12.10.0 (latest stable as of Dec 2024)
- React: 18.3.1 (project current, peer dependency satisfied)
- dagre: 0.8.5 (latest stable, optional)
