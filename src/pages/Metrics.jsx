
import React, { useState, useEffect, lazy, Suspense } from "react";
import { Task } from "@/api/entities";
import EmployeeGoalsService from "@/services/employeeGoalsService.js";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, BarChart2, ArrowUpRight, ArrowDownRight, ArrowRight, Target, TrendingUp } from "lucide-react";
import { ResponsiveContainer, BarChart, XAxis, YAxis, Bar, Tooltip, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { format, parseISO } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Lazy load TaskCreationForm for better performance
const TaskCreationForm = lazy(() => import("../components/task/TaskCreationForm"));
import { Badge } from "@/components/ui/badge";

export default function MetricsPage() {
  const [tasks, setTasks] = useState([]);
  const [metricTasks, setMetricTasks] = useState([]);
  const [showTaskCreation, setShowTaskCreation] = useState(false);
  
  // Goals analytics state
  const [goalsAnalytics, setGoalsAnalytics] = useState(null);
  const [employeeProgress, setEmployeeProgress] = useState({});
  const [loadingGoals, setLoadingGoals] = useState(true);

  useEffect(() => {
    loadTasks();
    loadGoalsAnalytics();
  }, []);

  const loadTasks = async () => {
    try {
      const taskData = await Task.list();
      setTasks(taskData);
      
      const metrics = taskData.filter(task => task.type === "metric");
      setMetricTasks(metrics);
    } catch (err) {
      console.error("Failed to load tasks:", err);
    }
  };

  const loadGoalsAnalytics = async () => {
    try {
      setLoadingGoals(true);
      const [analytics, progress] = await Promise.all([
        EmployeeGoalsService.getGoalsAnalytics(),
        EmployeeGoalsService.getEmployeeGoalsProgress()
      ]);
      
      setGoalsAnalytics(analytics);
      setEmployeeProgress(progress);
    } catch (error) {
      console.error('Error loading goals analytics:', error);
    } finally {
      setLoadingGoals(false);
    }
  };

  const handleCreateMetric = async (taskData) => {
    if (!taskData) {
      setShowTaskCreation(false);
      return;
    }

    try {
      await Task.create({
        ...taskData,
        type: "metric" // Ensure it's a metric type
      });
      await loadTasks();
      setShowTaskCreation(false);
    } catch (err) {
      console.error("Failed to create metric:", err);
    }
  };

  // Group metrics by KPI name
  const groupedMetrics = metricTasks.reduce((acc, task) => {
    const kpiName = task.metadata?.metric?.kpi_name;
    if (kpiName) {
      if (!acc[kpiName]) acc[kpiName] = [];
      acc[kpiName].push(task);
    }
    return acc;
  }, {});

  // Calculate trend for a given KPI
  const calculateTrend = (metrics) => {
    if (!metrics || metrics.length < 2) return { trend: "neutral", percentage: 0 };
    
    const sortedMetrics = [...metrics].sort((a, b) => 
      new Date(a.created_date) - new Date(b.created_date)
    );
    
    const latest = sortedMetrics[sortedMetrics.length - 1];
    const previous = sortedMetrics[sortedMetrics.length - 2];
    
    const currentVal = parseFloat(latest.metadata?.metric?.current_value) || 0;
    const previousVal = parseFloat(previous.metadata?.metric?.current_value) || 0;
    
    if (currentVal === previousVal) return { trend: "neutral", percentage: 0 };
    
    const diff = currentVal - previousVal;
    const percentage = previousVal !== 0 
      ? Math.abs(Math.round((diff / previousVal) * 100)) 
      : 0;
    
    return {
      trend: diff > 0 ? "up" : "down",
      percentage
    };
  };

  // Prepare chart data
  const prepareChartData = (metrics) => {
    return metrics
      .filter(task => task.metadata?.metric?.current_value)
      .map(task => ({
        date: format(new Date(task.created_date), "MMM dd"),
        value: parseFloat(task.metadata?.metric?.current_value) || 0,
        target: parseFloat(task.metadata?.metric?.target_value) || undefined
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Metrics Dashboard</h1>
          <Button onClick={() => setShowTaskCreation(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Track New Metric
          </Button>
        </div>

        {Object.keys(groupedMetrics).length === 0 ? (
          <Card className="bg-gray-50 border-dashed">
            <CardContent className="flex flex-col items-center justify-center h-64">
              <BarChart2 className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">No metrics being tracked</h3>
              <p className="text-gray-500 text-center mb-4">Start tracking your key product metrics to monitor performance</p>
              <Button onClick={() => setShowTaskCreation(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Metric
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(groupedMetrics).map(([kpiName, metrics]) => {
              const trend = calculateTrend(metrics);
              const chartData = prepareChartData(metrics);
              const latestMetric = metrics.sort((a, b) => 
                new Date(b.created_date) - new Date(a.created_date)
              )[0];
              
              const currentValue = latestMetric.metadata?.metric?.current_value;
              const targetValue = latestMetric.metadata?.metric?.target_value;
              
              return (
                <Card key={kpiName} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{kpiName}</CardTitle>
                        <CardDescription>
                          {latestMetric.metadata?.metric?.measurement_frequency || "Tracked periodically"}
                        </CardDescription>
                      </div>
                      <Badge variant="outline">{metrics.length} updates</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-0">
                    <div className="flex items-baseline justify-between">
                      <div className="text-2xl font-bold">{currentValue}</div>
                      {trend.percentage > 0 && (
                        <div className={`flex items-center ${
                          trend.trend === "up" ? "text-green-600" : "text-red-600"
                        }`}>
                          {trend.trend === "up" ? (
                            <ArrowUpRight className="h-4 w-4 mr-1" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4 mr-1" />
                          )}
                          {trend.percentage}%
                        </div>
                      )}
                    </div>
                    
                    {targetValue && (
                      <div className="flex items-center mt-1">
                        <ArrowRight className="h-3 w-3 mr-1 text-gray-400" />
                        <span className="text-sm text-gray-500">Target: {targetValue}</span>
                      </div>
                    )}
                    
                    <div className="h-36 mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <XAxis 
                            dataKey="date"
                            tick={{ fontSize: 12 }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis 
                            tick={{ fontSize: 12 }}
                            tickLine={false}
                            axisLine={false}
                            width={30}
                          />
                          <Tooltip />
                          <Line 
                            type="monotone" 
                            dataKey="value"
                            stroke="#6366F1" 
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                          />
                          {chartData.some(d => d.target !== undefined) && (
                            <Line
                              type="monotone"
                              dataKey="target"
                              stroke="#E5E7EB"
                              strokeWidth={1}
                              strokeDasharray="4 4"
                              dot={false}
                            />
                          )}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-4">
                    <div className="text-xs text-gray-500">
                      Last updated: {format(new Date(latestMetric.created_date), "PPp")}
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}

        {/* Goals Analytics Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Target className="h-5 w-5" />
              Goals Analytics
            </h2>
          </div>

          {loadingGoals ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="animate-pulse space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-3 bg-gray-200 rounded w-full"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : goalsAnalytics ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              {/* Total Goals */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Goals</p>
                      <div className="flex items-baseline gap-2">
                        <h3 className="text-2xl font-bold">{goalsAnalytics.totalGoals}</h3>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      </div>
                    </div>
                    <Target className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              {/* Active Goals */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Active Goals</p>
                      <div className="flex items-baseline gap-2">
                        <h3 className="text-2xl font-bold text-blue-600">
                          {goalsAnalytics.statusBreakdown.active}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {goalsAnalytics.totalGoals > 0 
                            ? Math.round((goalsAnalytics.statusBreakdown.active / goalsAnalytics.totalGoals) * 100)
                            : 0}%
                        </Badge>
                      </div>
                    </div>
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <ArrowUpRight className="h-4 w-4 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Completed Goals */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Completed</p>
                      <div className="flex items-baseline gap-2">
                        <h3 className="text-2xl font-bold text-green-600">
                          {goalsAnalytics.statusBreakdown.completed}
                        </h3>
                        <Badge variant="outline" className="text-xs bg-green-50">
                          {Math.round(goalsAnalytics.completionRate * 100)}%
                        </Badge>
                      </div>
                    </div>
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <ArrowUpRight className="h-4 w-4 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Paused Goals */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Paused</p>
                      <div className="flex items-baseline gap-2">
                        <h3 className="text-2xl font-bold text-yellow-600">
                          {goalsAnalytics.statusBreakdown.paused}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {goalsAnalytics.totalGoals > 0 
                            ? Math.round((goalsAnalytics.statusBreakdown.paused / goalsAnalytics.totalGoals) * 100)
                            : 0}%
                        </Badge>
                      </div>
                    </div>
                    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                      <ArrowRight className="h-4 w-4 text-yellow-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-muted-foreground">
                  No goals data available. Goals will appear here once team members have development goals.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Goals Progress by Employee */}
          {Object.keys(employeeProgress).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart2 className="h-5 w-5" />
                  Employee Goals Progress
                </CardTitle>
                <CardDescription>
                  Goal completion rates by team member
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(employeeProgress)
                    .sort(([,a], [,b]) => b.completionRate - a.completionRate)
                    .slice(0, 10)
                    .map(([employeeId, progress]) => (
                    <div key={employeeId} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <Target className="h-4 w-4 text-gray-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Employee {employeeId.slice(-4)}</p>
                          <p className="text-xs text-muted-foreground">
                            {progress.completed} of {progress.total} goals completed
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500 transition-all duration-300"
                            style={{ width: `${progress.completionRate * 100}%` }}
                          />
                        </div>
                        <Badge variant={progress.completionRate >= 0.7 ? "default" : "secondary"}>
                          {Math.round(progress.completionRate * 100)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Metric Creation Dialog */}
        <Dialog open={showTaskCreation} onOpenChange={setShowTaskCreation}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Track New Metric</DialogTitle>
            </DialogHeader>
            <Suspense fallback={
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-sm text-gray-600">Loading task form...</span>
              </div>
            }>
              <TaskCreationForm 
                onCreateTask={handleCreateMetric} 
                initialTaskData={{
                  status: "todo",
                  priority: "medium",
                  type: "metric",
                  metadata: {
                    metric: {}
                  }
                }}
              />
            </Suspense>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
