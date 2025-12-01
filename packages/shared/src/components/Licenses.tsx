/*
 * Copyright 2025 BigRack.dev
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';

// Try to import react-markdown, but make it optional
let ReactMarkdown: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ReactMarkdown = require('react-markdown').default;
} catch {
  // react-markdown not available
}

interface LicensesProps {
  content?: string;
  licensesUrl?: string;
  githubUrl?: string;
  onBack?: () => void;
  showBackButton?: boolean;
  backLabel?: string;
  fetchContent?: () => Promise<string>;
}

export function Licenses({
  content: initialContent,
  licensesUrl = 'https://raw.githubusercontent.com/baptiste-mnh/bigrack.dev/main/THIRD-PARTY-LICENSES.md',
  githubUrl = 'https://github.com/baptiste-mnh/bigrack.dev/blob/main/THIRD-PARTY-LICENSES.md',
  onBack,
  showBackButton = true,
  backLabel = 'Back',
  fetchContent,
}: LicensesProps) {
  const [content, setContent] = useState<string>(initialContent || '');
  const [loading, setLoading] = useState(!initialContent);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialContent) {
      setContent(initialContent);
      setLoading(false);
      return;
    }

    const loadContent = async () => {
      try {
        setLoading(true);
        let text: string;

        if (fetchContent) {
          text = await fetchContent();
        } else {
          const response = await fetch(licensesUrl, {
            cache: 'no-cache',
          });

          if (!response.ok) {
            throw new Error('Failed to fetch licenses');
          }

          text = await response.text();
        }

        setContent(text);
        setError(null);
      } catch (err) {
        console.error('Error fetching licenses:', err);
        setError('Unable to load licenses file.');
        setContent(
          `# Third-Party Licenses\n\nUnable to load licenses file. Please visit [GitHub](${githubUrl}) to view the licenses.`
        );
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [initialContent, licensesUrl, githubUrl, fetchContent]);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  const proseClasses =
    'prose prose-lg prose-slate max-w-none prose-headings:font-serif prose-headings:text-foreground prose-headings:font-bold prose-h1:text-4xl prose-h1:mb-6 prose-h1:mt-0 prose-h2:text-3xl prose-h2:mb-4 prose-h2:mt-8 prose-h3:text-2xl prose-h3:mb-3 prose-h3:mt-6 prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:mb-4 prose-a:text-primary prose-a:no-underline prose-a:font-medium hover:prose-a:underline prose-strong:text-foreground prose-strong:font-semibold prose-ul:text-muted-foreground prose-ul:my-4 prose-ol:text-muted-foreground prose-ol:my-4 prose-li:my-2 prose-li:leading-relaxed prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground prose-blockquote:my-6 prose-code:text-foreground prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-lg prose-pre:p-4 prose-pre:overflow-x-auto prose-pre:my-6 prose-img:rounded-lg prose-img:shadow-md prose-img:my-6 prose-img:mx-auto prose-hr:border-border prose-hr:my-8 prose-table:my-6 prose-table:w-full prose-th:border prose-th:border-border prose-th:bg-muted prose-th:px-4 prose-th:py-2 prose-th:text-left prose-th:font-semibold prose-th:text-foreground prose-td:border prose-td:border-border prose-td:px-4 prose-td:py-2 prose-td:text-muted-foreground';

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {showBackButton && (
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {backLabel}
          </Button>
        </div>
      )}

      {loading ? (
        <div className="bg-card rounded-xl shadow-sm border border-border/50 p-8 md:p-12">
          <p className="text-muted-foreground">Loading licenses...</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl shadow-sm border border-border/50 p-8 md:p-12">
          <article className={proseClasses}>
            {ReactMarkdown ? (
              <ReactMarkdown
                components={{
                  p: 'div',
                  a: (props: any) => <a {...props} target="_blank" rel="noopener noreferrer" />,
                  img: (props: any) => {
                    const src = props.src?.startsWith('http')
                      ? props.src
                      : props.src?.startsWith('/')
                        ? `https://raw.githubusercontent.com/baptiste-mnh/bigrack.dev/main${props.src}`
                        : `https://raw.githubusercontent.com/baptiste-mnh/bigrack.dev/main/${props.src}`;
                    return (
                      <img
                        src={src}
                        alt={props.alt || ''}
                        className="rounded-lg shadow-md max-w-full h-auto my-6 mx-auto"
                      />
                    );
                  },
                  code: (props: any) => {
                    const { inline, children, className, ...rest } = props;
                    if (inline) {
                      return (
                        <code
                          className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground"
                          {...rest}
                        >
                          {children}
                        </code>
                      );
                    }
                    return (
                      <pre className="bg-muted border border-border rounded-lg p-4 overflow-x-auto my-6">
                        <code className="text-sm font-mono text-foreground" {...rest}>
                          {children}
                        </code>
                      </pre>
                    );
                  },
                }}
              >
                {content}
              </ReactMarkdown>
            ) : (
              <pre className="whitespace-pre-wrap text-muted-foreground">{content}</pre>
            )}
          </article>
        </div>
      )}

      <div className="mt-8 text-center">
        <a
          href={githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          View on GitHub →
        </a>
      </div>
    </div>
  );
}
