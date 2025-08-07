import React, { useState } from 'react';
import { AnalyzeProject } from '@/api/integrations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  Users, 
  Target,
  AlertCircle,
  Info
} from 'lucide-react';
import RiskIndicator from './RiskIndicator';
import RecommendationsList from './RecommendationsList';

/**
 * Project Analysis Component
 * Provides AI-powered project risk analysis and recommendations
 */
export default function ProjectAnalysis({ project, onAnalysisComplete }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const analyzeProject = async () => {
    if (!project) {
      setError('No project data available for analysis');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await AnalyzeProject(project);
      setAnalysis(result);
      
      // Notify parent component if callback provided
      if (onAnalysisComplete) {
        onAnalysisComplete(result);
      }
    } catch (err) {
      console.error('Project analysis failed:', err);
      setError(err.message || 'Failed to analyze project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevelColor = (level) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getRiskIcon = (level) => {
    switch (level) {
      case 'low': return <CheckCircle className="h-4 w-4" />;
      case 'medium': return <Info className="h-4 w-4" />;
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      case 'critical': return <AlertCircle className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            AI Project Analysis
          </CardTitle>
          <Button
            onClick={analyzeProject}
            disabled={loading || !project}
            className="flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <TrendingUp className="h-4 w-4" />
                Analyze Project
              </>
            )}
          </Button>
        </div>
        {project && (
          <p className="text-sm text-muted-foreground">
            Analyzing: <strong>{project.name}</strong>
          </p>
        )}
      </CardHeader>

      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!analysis && !loading && !error && (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Click "Analyze Project" to get AI-powered insights about project risks, timeline predictions, and recommendations.</p>
          </div>
        )}

        {analysis && (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="risks">Risks</TabsTrigger>
              <TabsTrigger value="recommendations">Actions</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Risk Score */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Risk Assessment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <RiskIndicator score={analysis.riskScore} size="large" />
                      <div>
                        <div className="flex items-center gap-2">
                          {getRiskIcon(analysis.riskLevel)}
                          <Badge 
                            variant="outline" 
                            className={getRiskLevelColor(analysis.riskLevel)}
                          >
                            {analysis.riskLevel.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Risk Score: {analysis.riskScore}/100
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Timeline Prediction */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Timeline Prediction</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          Estimated Completion: <strong>{formatDate(analysis.timelinePredictions.estimatedCompletion)}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          Confidence: <strong>{analysis.timelinePredictions.confidenceLevel}%</strong>
                        </span>
                      </div>
                      <Progress 
                        value={analysis.timelinePredictions.confidenceLevel} 
                        className="h-2 mt-2"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Resource Analysis */}
              {analysis.resourceAnalysis && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Resource Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analysis.resourceAnalysis.currentUtilization !== undefined && (
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Current Utilization</span>
                            <span>{analysis.resourceAnalysis.currentUtilization}%</span>
                          </div>
                          <Progress value={analysis.resourceAnalysis.currentUtilization} className="h-2" />
                        </div>
                      )}
                      
                      {analysis.resourceAnalysis.skillGaps?.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Skill Gaps Identified:</p>
                          <div className="flex flex-wrap gap-1">
                            {analysis.resourceAnalysis.skillGaps.map((skill, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Executive Summary */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Executive Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{analysis.summary}</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="risks" className="space-y-4">
              <div className="space-y-3">
                {analysis.keyRisks.map((risk, index) => (
                  <Card key={index}>
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          {getRiskIcon(risk.impact)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium text-sm">{risk.category}</h4>
                            <Badge variant="outline" className={getRiskLevelColor(risk.impact)}>
                              {risk.impact} impact
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {risk.probability} probability
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {risk.description}
                          </p>
                          {risk.mitigation && (
                            <div className="bg-muted/50 p-2 rounded text-xs">
                              <strong>Mitigation:</strong> {risk.mitigation}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="recommendations">
              <RecommendationsList recommendations={analysis.recommendations} />
            </TabsContent>

            <TabsContent value="timeline" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Timeline Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-sm mb-2">Estimated Completion</h4>
                      <p className="text-lg font-semibold">
                        {formatDate(analysis.timelinePredictions.estimatedCompletion)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Confidence: {analysis.timelinePredictions.confidenceLevel}%
                      </p>
                    </div>
                    
                    {analysis.timelinePredictions.criticalPath?.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm mb-2">Critical Path</h4>
                        <div className="space-y-1">
                          {analysis.timelinePredictions.criticalPath.map((item, index) => (
                            <div key={index} className="text-sm bg-muted/50 p-2 rounded">
                              {item}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {analysis.timelinePredictions.potentialDelays?.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        Potential Delays
                      </h4>
                      <div className="space-y-2">
                        {analysis.timelinePredictions.potentialDelays.map((delay, index) => (
                          <Alert key={index} className="border-yellow-200 bg-yellow-50">
                            <AlertDescription className="text-sm">
                              {delay}
                            </AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
