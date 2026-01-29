/**
 * SearchResultBlock Component
 * Displays inline knowledge base search results with expandable code snippets
 */

import PropTypes from 'prop-types';
import { Search, FileCode, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ExpandableCodeBlock } from './ExpandableCodeBlock';

/**
 * Helper function to determine similarity score color
 */
const getSimilarityColor = (score, isProductMode) => {
  const pct = (score || 0) * 100;
  if (pct >= 80) return isProductMode ? 'text-green-400' : 'text-green-600';
  if (pct >= 60) return isProductMode ? 'text-yellow-400' : 'text-yellow-600';
  return isProductMode ? 'text-gray-400' : 'text-gray-500';
};

export function SearchResultBlock({
  query,
  codeResults = [],
  docsResults = [],
  isProductMode = false
}) {
  const hasResults = codeResults.length > 0 || docsResults.length > 0;

  return (
    <div className={cn(
      "p-4",
      isProductMode ? "bg-gray-900" : "bg-white"
    )}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Search className={cn(
          "h-4 w-4",
          isProductMode ? "text-purple-400" : "text-indigo-600"
        )} />
        <span className={cn(
          "text-sm font-medium",
          isProductMode ? "text-gray-300" : "text-gray-700"
        )}>
          Knowledge Search: &quot;{query}&quot;
        </span>
      </div>

      {!hasResults ? (
        <p className={cn(
          "text-sm",
          isProductMode ? "text-gray-500" : "text-gray-500"
        )}>
          No results found. Try a different search query.
        </p>
      ) : (
        <div className="space-y-4">
          {/* Code Results */}
          {codeResults.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <FileCode className={cn(
                  "h-3.5 w-3.5",
                  isProductMode ? "text-blue-400" : "text-blue-600"
                )} />
                <span className={cn(
                  "text-xs font-medium",
                  isProductMode ? "text-gray-400" : "text-gray-600"
                )}>
                  Code ({codeResults.length})
                </span>
              </div>
              <div className="space-y-2">
                {codeResults.map((result, idx) => (
                  <div key={idx} className="relative">
                    <ExpandableCodeBlock
                      code={result.code || result.content || ''}
                      language={result.language || 'plaintext'}
                      filePath={result.filePath || result.file_path || ''}
                      defaultOpen={idx === 0}
                      isProductMode={isProductMode}
                    />
                    {(result.similarity || result.score) && (
                      <span className={cn(
                        "absolute top-2 right-10 text-xs",
                        getSimilarityColor(result.similarity || result.score, isProductMode)
                      )}>
                        {Math.round((result.similarity || result.score) * 100)}%
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Docs Results */}
          {docsResults.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <FileText className={cn(
                  "h-3.5 w-3.5",
                  isProductMode ? "text-green-400" : "text-green-600"
                )} />
                <span className={cn(
                  "text-xs font-medium",
                  isProductMode ? "text-gray-400" : "text-gray-600"
                )}>
                  Documentation ({docsResults.length})
                </span>
              </div>
              <div className="space-y-2">
                {docsResults.map((result, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "p-2 rounded-lg border text-sm",
                      isProductMode
                        ? "border-gray-700 bg-gray-800"
                        : "border-gray-200 bg-gray-50"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn(
                        "font-medium truncate",
                        isProductMode ? "text-gray-200" : "text-gray-800"
                      )}>
                        {result.title || result.file_path || 'Document'}
                      </span>
                      {(result.similarity || result.score) && (
                        <span className={cn(
                          "text-xs shrink-0 ml-2",
                          getSimilarityColor(result.similarity || result.score, isProductMode)
                        )}>
                          {Math.round((result.similarity || result.score) * 100)}%
                        </span>
                      )}
                    </div>
                    <p className={cn(
                      "text-xs line-clamp-2",
                      isProductMode ? "text-gray-400" : "text-gray-600"
                    )}>
                      {result.excerpt || result.content || ''}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

SearchResultBlock.propTypes = {
  query: PropTypes.string,
  codeResults: PropTypes.arrayOf(PropTypes.shape({
    code: PropTypes.string,
    content: PropTypes.string,
    language: PropTypes.string,
    filePath: PropTypes.string,
    file_path: PropTypes.string,
    similarity: PropTypes.number,
    score: PropTypes.number,
  })),
  docsResults: PropTypes.arrayOf(PropTypes.shape({
    title: PropTypes.string,
    file_path: PropTypes.string,
    excerpt: PropTypes.string,
    content: PropTypes.string,
    similarity: PropTypes.number,
    score: PropTypes.number,
  })),
  isProductMode: PropTypes.bool,
};

export default SearchResultBlock;
