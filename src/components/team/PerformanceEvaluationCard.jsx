import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Award, Star, Pencil, Plus, Loader2 } from 'lucide-react';
import { PerformanceEvaluation, WorkItem } from '@/api/entities';
import { logger } from '@/utils/logger';
import PerformanceFormDialog from './PerformanceFormDialog';

const StarDisplay = ({ rating, size = 'sm' }) => {
  const stars = [];
  const fullStars = Math.floor(rating || 0);
  const hasHalfStar = (rating || 0) % 1 >= 0.5;

  for (let i = 1; i <= 5; i++) {
    if (i <= fullStars) {
      stars.push(
        <Star
          key={i}
          className={`${size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} fill-amber-400 text-amber-400`}
        />
      );
    } else if (i === fullStars + 1 && hasHalfStar) {
      stars.push(
        <Star
          key={i}
          className={`${size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} text-amber-400`}
          style={{ fill: 'url(#half-star-gradient)' }}
        />
      );
    } else {
      stars.push(
        <Star
          key={i}
          className={`${size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} text-gray-300`}
        />
      );
    }
  }

  return <div className="flex gap-0.5">{stars}</div>;
};

const PerformanceEvaluationCard = ({ teamMemberId }) => {
  const currentYear = new Date().getFullYear();

  const [evaluations, setEvaluations] = useState([]);
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [workItems, setWorkItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showFormDialog, setShowFormDialog] = useState(false);

  const yearOptions = [currentYear, currentYear - 1];

  const loadData = async () => {
    if (!teamMemberId) return;

    try {
      setLoading(true);
      const [evalData, workItemData] = await Promise.all([
        PerformanceEvaluation.list(teamMemberId),
        WorkItem.listByTeamMember(teamMemberId),
      ]);
      setEvaluations(Array.isArray(evalData) ? evalData : []);
      setWorkItems(Array.isArray(workItemData) ? workItemData : []);
    } catch (error) {
      logger.error('Error loading performance data', { error: String(error) });
      setEvaluations([]);
      setWorkItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [teamMemberId]);

  const selectedEvaluation = evaluations.find(
    (e) => e.year === parseInt(selectedYear, 10)
  );

  const isReadOnly = parseInt(selectedYear, 10) < currentYear;

  const getOverallRating = (selfTech, selfCollab, tech, collab) => {
    const ratings = [selfTech, selfCollab, tech, collab].filter((r) => r != null);
    if (ratings.length === 0) return null;
    return ratings.reduce((a, b) => a + b, 0) / ratings.length;
  };

  const handleCreate = async (data) => {
    try {
      setActionLoading(true);
      await PerformanceEvaluation.create({
        ...data,
        team_member_id: teamMemberId,
      });
      await loadData();
      setShowFormDialog(false);
    } catch (error) {
      logger.error('Error creating evaluation', { error: String(error) });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdate = async (data) => {
    if (!selectedEvaluation) return;

    try {
      setActionLoading(true);
      await PerformanceEvaluation.update(selectedEvaluation.id, data);
      await loadData();
      setShowFormDialog(false);
    } catch (error) {
      logger.error('Error updating evaluation', { error: String(error) });
    } finally {
      setActionLoading(false);
    }
  };

  const overallRating = selectedEvaluation
    ? getOverallRating(
        selectedEvaluation.self_technical_rating,
        selectedEvaluation.self_collaboration_rating,
        selectedEvaluation.technical_rating,
        selectedEvaluation.collaboration_rating
      )
    : null;

  const highlightedWorkItemDetails = selectedEvaluation?.highlighted_work_items
    ?.map((id) => workItems.find((w) => w.id === id))
    .filter(Boolean) || [];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Performance Evaluation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start gap-2">
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 shrink-0" />
              Performance
            </CardTitle>
            <div className="flex items-center gap-1">
              <Select
                value={selectedYear}
                onValueChange={setSelectedYear}
              >
                <SelectTrigger className="w-20 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedEvaluation && !isReadOnly && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setShowFormDialog(true)}
                  disabled={actionLoading}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          {overallRating && (
            <div className="flex items-center gap-2 mt-1">
              <StarDisplay rating={overallRating} size="sm" />
              <span className="text-sm text-gray-600">({overallRating.toFixed(1)})</span>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {!selectedEvaluation ? (
            <div className="text-center py-6">
              <Award className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm mb-4">No evaluation for {selectedYear}</p>
              {!isReadOnly && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFormDialog(true)}
                  disabled={actionLoading}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Evaluation
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {isReadOnly && (
                <Badge variant="secondary" className="mb-2">
                  Read-only (Previous Year)
                </Badge>
              )}

              {/* Ratings Section */}
              <div className="space-y-4">
                {/* Self-Assessment */}
                {(selectedEvaluation.self_technical_rating || selectedEvaluation.self_collaboration_rating) && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">Self-Assessment</p>
                    <div className="grid grid-cols-2 gap-4 pl-2">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Technical</p>
                        <div className="flex items-center gap-2">
                          <StarDisplay rating={selectedEvaluation.self_technical_rating} />
                          <span className="text-sm">
                            ({selectedEvaluation.self_technical_rating || '-'})
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Collaboration</p>
                        <div className="flex items-center gap-2">
                          <StarDisplay rating={selectedEvaluation.self_collaboration_rating} />
                          <span className="text-sm">
                            ({selectedEvaluation.self_collaboration_rating || '-'})
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Manager Assessment */}
                {(selectedEvaluation.technical_rating || selectedEvaluation.collaboration_rating) && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">Manager Assessment</p>
                    <div className="grid grid-cols-2 gap-4 pl-2">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Technical</p>
                        <div className="flex items-center gap-2">
                          <StarDisplay rating={selectedEvaluation.technical_rating} />
                          <span className="text-sm">
                            ({selectedEvaluation.technical_rating || '-'})
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Collaboration</p>
                        <div className="flex items-center gap-2">
                          <StarDisplay rating={selectedEvaluation.collaboration_rating} />
                          <span className="text-sm">
                            ({selectedEvaluation.collaboration_rating || '-'})
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Overall Rating */}
                {overallRating && (
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500">Overall</span>
                      <div className="flex items-center gap-2">
                        <StarDisplay rating={overallRating} />
                        <span className="text-sm font-medium">
                          ({overallRating.toFixed(2)})
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {selectedEvaluation.summary && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Summary</p>
                  <p className="text-sm text-gray-700">{selectedEvaluation.summary}</p>
                </div>
              )}

              {selectedEvaluation.strengths && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Strengths</p>
                  <p className="text-sm text-gray-700 whitespace-pre-line">
                    {selectedEvaluation.strengths}
                  </p>
                </div>
              )}

              {selectedEvaluation.areas_for_improvement && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Areas for Improvement</p>
                  <p className="text-sm text-gray-700 whitespace-pre-line">
                    {selectedEvaluation.areas_for_improvement}
                  </p>
                </div>
              )}

              {selectedEvaluation.main_points?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Main Points</p>
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                    {selectedEvaluation.main_points.map((point, idx) => (
                      <li key={idx}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}

              {highlightedWorkItemDetails.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">
                    Key Contributions ({highlightedWorkItemDetails.length})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {highlightedWorkItemDetails.map((item) => (
                      <Badge key={item.id} variant="outline" className="text-xs">
                        {item.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <PerformanceFormDialog
        open={showFormDialog}
        onOpenChange={setShowFormDialog}
        onSubmit={selectedEvaluation ? handleUpdate : handleCreate}
        initialData={selectedEvaluation}
        workItems={workItems}
        isLoading={actionLoading}
      />
    </>
  );
};

export default PerformanceEvaluationCard;
