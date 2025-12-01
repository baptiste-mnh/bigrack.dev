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

import { Shield, FileText, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';

interface LegalProps {
  onBack?: () => void;
  showBackButton?: boolean;
  backLabel?: string;
}

export function Legal({ onBack, showBackButton = true, backLabel = 'Back' }: LegalProps) {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
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

      <div className="bg-card rounded-xl shadow-sm border border-border/50 p-8 md:p-12 space-y-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground">Legal</h1>
          <p className="text-muted-foreground mt-2">Transparency and terms for BigRack</p>
        </div>

        {/* Privacy Policy */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold">Privacy Policy</h2>
          </div>

          <div className="prose prose-muted max-w-none pl-1">
            <p className="text-foreground font-medium">BigRack is a local-first application.</p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground mt-4">
              <li>
                We <strong>do not collect</strong>, store, or transfer your personal data.
              </li>
              <li>
                We <strong>do not use cookies</strong> or tracking analytics.
              </li>
              <li>
                All your data (projects, tasks, context) lives <strong>strictly on your machine</strong> and never
                leaves it.
              </li>
            </ul>
          </div>
        </section>

        <div className="h-px bg-border/50 w-full" />

        {/* Terms of Service */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold">Terms of Service</h2>
          </div>

          <div className="prose prose-muted max-w-none pl-1">
            <p className="text-muted-foreground leading-relaxed">
              This software is free and open source, provided <strong>"as is"</strong>, without warranty of any kind,
              express or implied.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              By using this software, you agree that the authors are not liable for any claim, damages, or other
              liability.
            </p>
            <p className="text-muted-foreground mt-6">
              For full legal details, please refer to the{' '}
              <a
                href="https://www.apache.org/licenses/LICENSE-2.0"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium"
              >
                Apache 2.0 License
              </a>
              .
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
