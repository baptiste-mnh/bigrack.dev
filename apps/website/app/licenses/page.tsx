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

import { Navbar } from '../../components/Navbar';
import { LicensesClient } from './LicensesClient';

async function getLicensesContent() {
  try {
    const response = await fetch(
      'https://raw.githubusercontent.com/baptiste-mnh/bigrack.dev/main/THIRD-PARTY-LICENSES.md',
      {
        next: { revalidate: 3600 }, // Revalidate every hour
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch licenses');
    }

    return await response.text();
  } catch (error) {
    console.error('Error fetching licenses:', error);
    return '# Third-Party Licenses\n\nUnable to load licenses file. Please visit [GitHub](https://github.com/baptiste-mnh/bigrack.dev/blob/main/THIRD-PARTY-LICENSES.md) to view the licenses.';
  }
}

export default async function LicensesPage() {
  const content = await getLicensesContent();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <LicensesClient content={content} />
    </div>
  );
}
