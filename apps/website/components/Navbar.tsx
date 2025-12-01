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

import Link from 'next/link';
import Image from 'next/image';

interface NavbarProps {
  variant?: 'default' | 'docs';
}

export function Navbar({ variant = 'default' }: NavbarProps) {
  return (
    <div className="sticky top-0 z-50 px-4 pt-4">
      <nav
        className={`mx-auto border border-white/20 bg-white/60 backdrop-blur-xl rounded-full shadow-lg shadow-black/5 max-w-7xl`}
      >
        <div className="flex h-14 items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3 group">
            <Image
              src="/logo.png"
              alt="BigRack logo"
              width={40}
              height={40}
              className="h-8 w-8 rounded-lg transition-transform group-hover:scale-105"
              priority
            />
            <span className="text-xl font-logo font-semibold text-foreground">BigRack.dev</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/docs"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Documentation
            </Link>
            <Link
              href="https://dashboard.bigrack.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="https://github.com/baptiste-mnh/bigrack.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
            >
              GitHub
            </Link>
          </div>
        </div>
      </nav>
    </div>
  );
}
