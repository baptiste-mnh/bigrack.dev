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

import { useRouter } from 'next/navigation';
import { Licenses } from '@bigrack/shared';

interface LicensesClientProps {
  content: string;
}

export function LicensesClient({ content }: LicensesClientProps) {
  const router = useRouter();

  return (
    <Licenses
      content={content}
      onBack={() => router.back()}
      backLabel="← Back to home"
      licensesUrl="https://raw.githubusercontent.com/baptiste-mnh/bigrack.dev/main/THIRD-PARTY-LICENSES.md"
      githubUrl="https://github.com/baptiste-mnh/bigrack.dev/blob/main/THIRD-PARTY-LICENSES.md"
    />
  );
}




