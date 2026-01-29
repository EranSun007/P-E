// src/components/knowledge/RepositoryStats.jsx
import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Database, BarChart3, PieChartIcon } from 'lucide-react';
import { apiClient } from '@/api/apiClient';

// Chart colors
const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c43', '#a855f7', '#06b6d4', '#f43f5e'];

export function RepositoryStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        const data = await apiClient.knowledge.getStats();
        setStats(data);
        setError(null);
      } catch (err) {
        console.error('Failed to load stats:', err);
        setError(err.message || 'Failed to load repository statistics');
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
          <div className="text-center">
            <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
          <div className="text-center">
            <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No statistics available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Transform stats for charts - handle both camelCase and snake_case
  const byTypeData = Object.entries(stats.byArtifactType || stats.by_artifact_type || {}).map(
    ([type, count]) => ({ name: type, count })
  );

  const byLanguageData = Object.entries(stats.byLanguage || stats.by_language || {}).map(
    ([lang, count]) => ({ name: lang, count })
  );

  const byRepoData = Object.entries(stats.byRepository || stats.by_repository || {}).map(
    ([repo, count]) => ({ name: repo, count })
  );

  const totalItems = stats.totalItems || stats.total_items ||
    byTypeData.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Repository Statistics
            </CardTitle>
            <CardDescription>
              Indexed content breakdown from knowledge base
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-lg px-3 py-1">
            {totalItems.toLocaleString()} items
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="type">
          <TabsList className="mb-4">
            <TabsTrigger value="type" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              By Type
            </TabsTrigger>
            <TabsTrigger value="language" className="gap-2">
              <PieChartIcon className="h-4 w-4" />
              By Language
            </TabsTrigger>
            <TabsTrigger value="repo" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              By Repository
            </TabsTrigger>
          </TabsList>

          <TabsContent value="type">
            {byTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={byTypeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No artifact type data available
              </div>
            )}
          </TabsContent>

          <TabsContent value="language">
            {byLanguageData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={byLanguageData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {byLanguageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No language data available
              </div>
            )}
          </TabsContent>

          <TabsContent value="repo">
            {byRepoData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={byRepoData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No repository data available
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
