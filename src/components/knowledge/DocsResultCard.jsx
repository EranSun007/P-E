// src/components/knowledge/DocsResultCard.jsx
import PropTypes from 'prop-types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, ExternalLink } from 'lucide-react';

export function DocsResultCard({ result }) {
  const title = result.title || result.name || 'Untitled';
  const content = result.content || result.summary || '';
  const domain = result.domain || '';
  const category = result.category || '';
  const url = result.url || result.source_url || '';

  return (
    <Card className="mb-4">
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <span className="font-medium truncate">{title}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {domain && (
              <Badge variant="outline" className="text-xs">
                {domain}
              </Badge>
            )}
            {category && (
              <Badge variant="secondary" className="text-xs">
                {category}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-4 pb-4">
        <p className="text-sm text-muted-foreground line-clamp-4">
          {content}
        </p>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            View source
          </a>
        )}
      </CardContent>
    </Card>
  );
}

DocsResultCard.propTypes = {
  result: PropTypes.shape({
    title: PropTypes.string,
    name: PropTypes.string,
    content: PropTypes.string,
    summary: PropTypes.string,
    domain: PropTypes.string,
    category: PropTypes.string,
    url: PropTypes.string,
    source_url: PropTypes.string,
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }).isRequired,
};
