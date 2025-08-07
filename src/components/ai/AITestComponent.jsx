import React, { useState } from 'react';
import { CheckAIHealth, GetAvailableModels, ExtractTaskFromNaturalLanguage } from '@/api/integrations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Wifi, 
  WifiOff,
  TestTube,
  Zap
} from 'lucide-react';

/**
 * AI Test Component
 * Simple component to test SAP AI Core integration
 */
export default function AITestComponent() {
  const [healthStatus, setHealthStatus] = useState(null);
  const [models, setModels] = useState([]);
  const [testInput, setTestInput] = useState('Schedule a high priority meeting with the design team next Friday at 2pm to review the Q1 roadmap');
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState({
    health: false,
    models: false,
    task: false
  });
  const [errors, setErrors] = useState({});

  const testHealthCheck = async () => {
    setLoading(prev => ({ ...prev, health: true }));
    setErrors(prev => ({ ...prev, health: null }));
    
    try {
      const result = await CheckAIHealth();
      setHealthStatus(result);
      console.log('Health check result:', result);
    } catch (error) {
      console.error('Health check failed:', error);
      setErrors(prev => ({ ...prev, health: error.message }));
    } finally {
      setLoading(prev => ({ ...prev, health: false }));
    }
  };

  const testGetModels = async () => {
    setLoading(prev => ({ ...prev, models: true }));
    setErrors(prev => ({ ...prev, models: null }));
    
    try {
      const result = await GetAvailableModels();
      setModels(result.data || []);
      console.log('Available models:', result);
    } catch (error) {
      console.error('Get models failed:', error);
      setErrors(prev => ({ ...prev, models: error.message }));
    } finally {
      setLoading(prev => ({ ...prev, models: false }));
    }
  };

  const testTaskExtraction = async () => {
    if (!testInput.trim()) return;
    
    setLoading(prev => ({ ...prev, task: true }));
    setErrors(prev => ({ ...prev, task: null }));
    
    try {
      const result = await ExtractTaskFromNaturalLanguage(testInput);
      setTestResult(result);
      console.log('Task extraction result:', result);
    } catch (error) {
      console.error('Task extraction failed:', error);
      setErrors(prev => ({ ...prev, task: error.message }));
    } finally {
      setLoading(prev => ({ ...prev, task: false }));
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'degraded': return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'unhealthy': return <WifiOff className="h-4 w-4 text-red-600" />;
      default: return <Wifi className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800 border-green-300';
      case 'degraded': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'unhealthy': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
          <TestTube className="h-6 w-6" />
          SAP AI Core Integration Test
        </h1>
        <p className="text-muted-foreground">
          Test the connection and functionality of SAP AI Core services
        </p>
      </div>

      {/* Health Check */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            Service Health Check
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={testHealthCheck} 
            disabled={loading.health}
            className="flex items-center gap-2"
          >
            {loading.health ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Check Health
              </>
            )}
          </Button>

          {errors.health && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.health}</AlertDescription>
            </Alert>
          )}

          {healthStatus && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {getStatusIcon(healthStatus.data?.status)}
                <Badge variant="outline" className={getStatusColor(healthStatus.data?.status)}>
                  {healthStatus.data?.status?.toUpperCase() || 'UNKNOWN'}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Last updated: {healthStatus.data?.lastUpdated ? new Date(healthStatus.data.lastUpdated).toLocaleTimeString() : 'Unknown'}
                </span>
              </div>
              
              {healthStatus.data?.models && healthStatus.data.models.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-1">Model Status:</p>
                  <div className="space-y-1">
                    {healthStatus.data.models.map((model, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <div className={`w-2 h-2 rounded-full ${model.status === 'available' ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span>{model.id}</span>
                        <Badge variant="secondary" className="text-xs">
                          {model.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Models */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Available Models
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={testGetModels} 
            disabled={loading.models}
            className="flex items-center gap-2"
          >
            {loading.models ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Get Models
              </>
            )}
          </Button>

          {errors.models && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.models}</AlertDescription>
            </Alert>
          )}

          {models.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Found {models.length} model(s):</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {models.map((model, index) => (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-sm">{model.name}</h4>
                      <Badge variant={model.isAvailable ? "default" : "secondary"}>
                        {model.isAvailable ? 'Available' : 'Unavailable'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{model.description}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {model.capabilities?.map((cap, capIndex) => (
                        <Badge key={capIndex} variant="outline" className="text-xs">
                          {cap}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Task Extraction Test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Task Extraction Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Test Input:</label>
            <Textarea
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="Enter a natural language task description..."
              className="h-20"
            />
          </div>

          <Button 
            onClick={testTaskExtraction} 
            disabled={loading.task || !testInput.trim()}
            className="flex items-center gap-2"
          >
            {loading.task ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <TestTube className="h-4 w-4" />
                Extract Task
              </>
            )}
          </Button>

          {errors.task && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.task}</AlertDescription>
            </Alert>
          )}

          {testResult && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Extraction Result:</p>
              <div className="bg-muted/50 rounded-lg p-4">
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
