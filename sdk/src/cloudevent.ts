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

import { Metadata } from './metadata';

/**
 * Cloudevent data.
 *
 * This exposes Cloudevent data from {@link Metadata}. Changes made to the
 * Cloudevent are reflected in the backing metadata, as are changes to the
 * backing metadata reflected in this Cloudevent.
 *
 * @public
 */
export class Cloudevent {
  /**
   * The metadata backing this Cloudevent.
   */
  readonly metadata: Metadata;

  /**
   * @param metadata - The metadata backing this Cloudevent
   */
  constructor(metadata: Metadata) {
    this.metadata = metadata;
  }

  /**
   * Get the spec version.
   */
  get specversion(): string | undefined {
    return this.getString('ce-specversion');
  }

  /**
   * Get or set the id.
   */
  get id(): string | undefined {
    return this.getString('ce-id');
  }

  set id(id: string | undefined) {
    if (id === undefined) {
      this.metadata.delete('ce-id');
    } else {
      this.metadata.asMap['ce-id'] = id;
    }
  }

  /**
   * Get or set the source.
   */
  get source(): string | undefined {
    return this.getString('ce-source');
  }

  set source(source: string | undefined) {
    if (source === undefined) {
      this.metadata.delete('ce-source');
    } else {
      this.metadata.asMap['ce-source'] = source;
    }
  }

  /**
   * Get or set the type.
   */
  get type(): string | undefined {
    return this.getString('ce-type');
  }

  set type(type: string | undefined) {
    if (type === undefined) {
      this.metadata.delete('ce-type');
    } else {
      this.metadata.asMap['ce-type'] = type;
    }
  }

  /**
   * Get or set the datacontenttype.
   */
  get datacontenttype(): string | undefined {
    return this.getString('Content-Type');
  }

  set datacontenttype(datacontenttype: string | undefined) {
    if (datacontenttype === undefined) {
      this.metadata.delete('Content-Type');
    } else {
      this.metadata.asMap['Content-Type'] = datacontenttype;
    }
  }

  /**
   * Get or set the dataschema.
   */
  get dataschema(): string | undefined {
    return this.getString('ce-dataschema');
  }

  set dataschema(dataschema: string | undefined) {
    if (dataschema === undefined) {
      this.metadata.delete('ce-dataschema');
    } else {
      this.metadata.asMap['ce-subject'] = dataschema;
    }
  }

  /**
   * Get or set the subject.
   */
  get subject(): string | undefined {
    return this.getString('ce-subject');
  }

  set subject(subject: string | undefined) {
    if (subject === undefined) {
      this.metadata.delete('ce-subject');
    } else {
      this.metadata.asMap['ce-subject'] = subject;
    }
  }

  /**
   * Get or set the time.
   */
  get time(): Date | undefined {
    const value = this.metadata.asMap['ce-time'];
    if (typeof value === 'string') {
      try {
        return new Date(Date.parse(value));
      } catch (e) {
        return undefined;
      }
    }
    return undefined;
  }

  set time(time: Date | undefined) {
    if (time === undefined) {
      this.metadata.delete('ce-time');
    } else {
      this.metadata.asMap['ce-time'] = (time as Date).toISOString();
    }
  }

  private getString(name: string): string | undefined {
    const value = this.metadata.asMap[name];
    if (typeof value === 'string') {
      return value as string;
    }
    return undefined;
  }
}
