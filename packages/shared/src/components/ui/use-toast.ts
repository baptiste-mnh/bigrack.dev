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

// Re-export Sonner toast function for backward compatibility
export { toast } from 'sonner';

// Legacy useToast hook for backward compatibility
// This maintains the same API but uses Sonner under the hood
import { toast as sonnerToast } from 'sonner';

export function useToast() {
  return {
    toast: (props: {
      title?: string;
      description?: string;
      variant?: 'default' | 'destructive';
    }) => {
      if (props.variant === 'destructive') {
        return sonnerToast.error(props.title || props.description || 'Error', {
          description: props.title && props.description ? props.description : undefined,
        });
      }
      return sonnerToast(props.title || props.description || 'Notification', {
        description: props.title && props.description ? props.description : undefined,
      });
    },
  };
}
