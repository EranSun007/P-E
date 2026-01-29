// src/pages/KnowledgeSearch.jsx
import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { Search, Code, FileText, Loader2, AlertCircle } from 'lucide-react';
import { apiClient } from '@/api/apiClient';
import { CodeResultCard } from '@/components/knowledge/CodeResultCard';
import { DocsResultCard } from '@/components/knowledge/DocsResultCard';

const KnowledgeSearch = () => {
  // Search state
  const [query, setQuery] = useState('');
  const [codeResults, setCodeResults] = useState([]);
  const [docsResults, setDocsResults] = useState([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      // Search code and docs in parallel
      const [codeResponse, docsResponse] = await Promise.all([
        apiClient.knowledge.searchCode({ query: query.trim(), limit: 20 }),
        apiClient.knowledge.searchDocs({ query: query.trim(), limit: 20 }),
      ]);

      setCodeResults(codeResponse.results || codeResponse || []);
      setDocsResults(docsResponse.results || docsResponse || []);
    } catch (err) {
      console.error('Search failed:', err);
      setError(err.message || 'Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [query]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header with search bar */}
      <div className="p-4 border-b bg-background">
        <div className="flex items-center gap-4 max-w-4xl mx-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search code and documentation..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-10"
            />
          </div>
          <Button onClick={handleSearch} disabled={loading || !query.trim()}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Search
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="p-4 bg-destructive/10 border-b border-destructive/20">
          <div className="flex items-center gap-2 text-destructive max-w-4xl mx-auto">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Results area */}
      <div className="flex-1 min-h-0">
        {!hasSearched ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Enter a query to search code and documentation</p>
            </div>
          </div>
        ) : loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {/* Code Results Panel */}
            <ResizablePanel defaultSize={50} minSize={25}>
              <div className="h-full flex flex-col">
                <div className="p-4 border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    <h2 className="font-semibold">Code Results</h2>
                    <span className="text-sm text-muted-foreground">
                      ({codeResults.length})
                    </span>
                  </div>
                </div>
                <ScrollArea className="flex-1 p-4">
                  {codeResults.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <Code className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No code results found</p>
                    </div>
                  ) : (
                    codeResults.map((result, index) => (
                      <CodeResultCard key={result.id || index} result={result} />
                    ))
                  )}
                </ScrollArea>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Documentation Results Panel */}
            <ResizablePanel defaultSize={50} minSize={25}>
              <div className="h-full flex flex-col">
                <div className="p-4 border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <h2 className="font-semibold">Documentation</h2>
                    <span className="text-sm text-muted-foreground">
                      ({docsResults.length})
                    </span>
                  </div>
                </div>
                <ScrollArea className="flex-1 p-4">
                  {docsResults.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No documentation found</p>
                    </div>
                  ) : (
                    docsResults.map((result, index) => (
                      <DocsResultCard key={result.id || index} result={result} />
                    ))
                  )}
                </ScrollArea>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>
    </div>
  );
};

export default KnowledgeSearch;
