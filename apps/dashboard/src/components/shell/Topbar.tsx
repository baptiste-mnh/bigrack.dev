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

import LogoImage from '../../assets/logo.png';
import { Breadcrumbs } from './Breadcrumbs';

interface TopbarProps {
  statusText?: string;
}

export function Topbar({ statusText }: TopbarProps) {
  return (
    <header className="border-b border-border bg-card/80 backdrop-blur">
      <div className="px-4">
        <div className="h-14 flex items-center gap-3">
          {/* Brand */}
          <div className="flex items-center gap-2 mr-2">
            <img src={LogoImage} alt="BigRack logo" className="h-7 w-7 rounded-lg" />
            <span className="text-lg font-semibold text-foreground font-logo">BigRack</span>
          </div>

          {/* Breadcrumbs */}
          <div className="flex-1 min-w-0">
            <Breadcrumbs />
          </div>

          {/* Status */}
          {statusText && (
            <div className="hidden md:block text-xs text-muted-foreground ml-3">{statusText}</div>
          )}
        </div>
      </div>
    </header>
  );
}
