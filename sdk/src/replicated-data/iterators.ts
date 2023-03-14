/*
 * Copyright 2021-2023 Lightbend Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Internal utility functions for iterators

// Map an iterator to a new iterator
export function map<T, U>(
  iter: Iterator<T>,
  f: (value: T) => U,
): IterableIterator<U> {
  const mapped: IterableIterator<U> = {
    [Symbol.iterator]: () => mapped,
    next: () => {
      const next = iter.next();
      if (next.done) {
        return {
          value: undefined,
          done: true,
        };
      } else {
        return {
          value: f(next.value),
          done: false,
        };
      }
    },
  };
  return mapped;
}
