// src/components/knowledge/CodeResultCard.jsx
import PropTypes from 'prop-types';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileCode } from 'lucide-react';
import { detectLanguage } from './LanguageDetector';
import { SimilarityScore } from './SimilarityScore';

// Register only needed languages (bundle optimization)
import javascript from 'react-syntax-highlighter/dist/esm/languages/hljs/javascript';
import typescript from 'react-syntax-highlighter/dist/esm/languages/hljs/typescript';
import python from 'react-syntax-highlighter/dist/esm/languages/hljs/python';
import java from 'react-syntax-highlighter/dist/esm/languages/hljs/java';
import go from 'react-syntax-highlighter/dist/esm/languages/hljs/go';
import json from 'react-syntax-highlighter/dist/esm/languages/hljs/json';
import yaml from 'react-syntax-highlighter/dist/esm/languages/hljs/yaml';
import bash from 'react-syntax-highlighter/dist/esm/languages/hljs/bash';

SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('java', java);
SyntaxHighlighter.registerLanguage('go', go);
SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('yaml', yaml);
SyntaxHighlighter.registerLanguage('bash', bash);

export function CodeResultCard({ result }) {
  const language = detectLanguage(result.language, result.filePath || result.file_path);
  const filePath = result.filePath || result.file_path || 'unknown';
  const code = result.code || result.content || '';
  const repoName = result.repoName || result.repo_name || '';
  const similarity = result.similarity || result.score || result.similarity_score;

  return (
    <Card className="mb-4">
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <FileCode className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <code className="text-sm truncate">{filePath}</code>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {similarity !== undefined && (
              <SimilarityScore score={similarity} showLabel={false} size="small" />
            )}
            {repoName && (
              <Badge variant="outline" className="text-xs">
                {repoName}
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              {language}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-4 pb-4">
        <SyntaxHighlighter
          language={language}
          style={docco}
          showLineNumbers={true}
          wrapLines={true}
          customStyle={{
            margin: 0,
            borderRadius: '0.5rem',
            fontSize: '0.75rem',
            maxHeight: '300px',
            overflow: 'auto',
          }}
        >
          {code}
        </SyntaxHighlighter>
      </CardContent>
    </Card>
  );
}

CodeResultCard.propTypes = {
  result: PropTypes.shape({
    language: PropTypes.string,
    filePath: PropTypes.string,
    file_path: PropTypes.string,
    code: PropTypes.string,
    content: PropTypes.string,
    repoName: PropTypes.string,
    repo_name: PropTypes.string,
    similarity: PropTypes.number,
    score: PropTypes.number,
    similarity_score: PropTypes.number,
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }).isRequired,
};
