import { useState, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import EntityNode from '@/components/schema/EntityNode';
import { transformSchemaToGraph } from '@/components/schema/schemaTransform';

const nodeTypes = {
  entity: EntityNode
};

/**
 * EntityModel - Visual database schema viewer
 *
 * Displays database tables as interactive nodes on a ReactFlow canvas.
 * Shows table structures, columns, and foreign key relationships.
 */
export default function EntityModel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    async function loadSchema() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/schema/tables');
        if (!response.ok) {
          throw new Error(`Failed to load schema: ${response.statusText}`);
        }

        const tables = await response.json();
        const { nodes: graphNodes, edges: graphEdges } = transformSchemaToGraph(tables);

        setNodes(graphNodes);
        setEdges(graphEdges);
      } catch (err) {
        console.error('Error loading schema:', err);
        setError(err.message || 'Failed to load database schema');
      } finally {
        setLoading(false);
      }
    }

    loadSchema();
  }, [setNodes, setEdges]);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    // Re-trigger useEffect by resetting state
    window.location.reload();
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading database schema...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Failed to Load Schema
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Main canvas
  return (
    <div className="w-full h-[calc(100vh-120px)]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.3}
        maxZoom={2}
      >
        <Controls />
        <Background variant="dots" />
      </ReactFlow>
    </div>
  );
}
