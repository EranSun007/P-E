/**
 * ExpandableCodeBlock Component
 * Collapsible code snippet with syntax highlighting
 */

import { useState } from 'react';
import PropTypes from 'prop-types';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

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

export function ExpandableCodeBlock({
  code,
  language = 'plaintext',
  filePath = '',
  defaultOpen = false,
  isProductMode = false
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState(false);

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Normalize language for syntax highlighter
  const normalizedLang = language?.toLowerCase() || 'plaintext';

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={cn(
        "border rounded-lg overflow-hidden",
        isProductMode ? "border-gray-700" : "border-gray-200"
      )}>
        <CollapsibleTrigger className="w-full">
          <div className={cn(
            "flex items-center justify-between p-2",
            isProductMode
              ? "bg-gray-800 hover:bg-gray-750"
              : "bg-muted/30 hover:bg-muted/50"
          )}>
            <div className="flex items-center gap-2 min-w-0">
              {isOpen
                ? <ChevronDown className="h-4 w-4 shrink-0" />
                : <ChevronRight className="h-4 w-4 shrink-0" />
              }
              <code className={cn(
                "text-xs truncate",
                isProductMode ? "text-gray-300" : "text-gray-700"
              )}>{filePath || 'code'}</code>
              <span className={cn(
                "text-xs px-1.5 py-0.5 rounded shrink-0",
                isProductMode
                  ? "bg-gray-700 text-gray-400"
                  : "bg-gray-100 text-gray-500"
              )}>{normalizedLang}</span>
            </div>
            <button
              onClick={handleCopy}
              className={cn(
                "p-1 rounded shrink-0",
                isProductMode ? "hover:bg-gray-700" : "hover:bg-gray-200"
              )}
              title="Copy code"
            >
              {copied
                ? <Check className="h-3 w-3 text-green-500" />
                : <Copy className={cn("h-3 w-3", isProductMode ? "text-gray-400" : "text-gray-500")} />
              }
            </button>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SyntaxHighlighter
            language={normalizedLang}
            style={docco}
            showLineNumbers={true}
            customStyle={{
              margin: 0,
              fontSize: '0.7rem',
              maxHeight: '200px',
              overflow: 'auto',
              background: isProductMode ? '#1f2937' : undefined
            }}
          >
            {code || ''}
          </SyntaxHighlighter>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

ExpandableCodeBlock.propTypes = {
  code: PropTypes.string.isRequired,
  language: PropTypes.string,
  filePath: PropTypes.string,
  defaultOpen: PropTypes.bool,
  isProductMode: PropTypes.bool,
};

export default ExpandableCodeBlock;
