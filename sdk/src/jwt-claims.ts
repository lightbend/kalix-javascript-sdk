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

const JwtClaimPrefix = '_kalix-jwt-claim-';

/**
 * JWT claims that were part of the bearer token with this request.
 *
 * @public
 */
export class JwtClaims {
  /**
   * The metadata backing this JWT claims object.
   */
  readonly metadata: Metadata;

  /**
   * This exposes JWT claims that were extracted from the bearer token.
   *
   * @param metadata - The metadata that the JWT claims come from
   */
  constructor(metadata: Metadata) {
    this.metadata = metadata;
  }

  /**
   * Get the issuer, that is, the <tt>iss</tt> claim, as described in RFC 7519 section 4.1.1.
   *
   * @returns the issuer, if present.
   * @see {@link https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.1 |RFC 7519 section 4.1.1}
   */
  get issuer(): string | undefined {
    return this.getString('iss');
  }

  /**
   * Get the subject, that is, the <tt>sub</tt> claim, as described in RFC 7519 section 4.1.2.
   *
   * @returns the subject, if present.
   * @see {@link https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.2 |RFC 7519 section 4.1.2}
   */
  get subject(): string | undefined {
    return this.getString('sub');
  }

  /**
   * Get the audience, that is, the <tt>aud</tt> claim, as described in RFC 7519 section 4.1.3.
   *
   * @returns the audience, if present.
   * @see {@link https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.3 |RFC 7519 section 4.1.3}
   */
  get audience(): string | undefined {
    return this.getString('aud');
  }

  /**
   * Get the expiration time, that is, the <tt>exp</tt> claim, as described in RFC 7519 section 4.1.4.
   *
   * @returns the expiration time, if present.
   * @see {@link https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.4 |RFC 7519 section 4.1.4}
   */
  get expirationTime(): Date | undefined {
    return this.getNumericDate('exp');
  }

  /**
   * Get the not before, that is, the <tt>nbf</tt> claim, as described in RFC 7519 section 4.1.5.
   *
   * @returns the not before, if present.
   * @see {@link https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.5 |RFC 7519 section 4.1.5}
   */
  get notBefore(): Date | undefined {
    return this.getNumericDate('nbf');
  }

  /**
   * Get the issued at, that is, the <tt>iat</tt> claim, as described in RFC 7519 section 4.1.6.
   *
   * @returns the issued at, if present.
   * @see {@link https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.6 |RFC 7519 section 4.1.6}
   */
  get issuedAt(): Date | undefined {
    return this.getNumericDate('iat');
  }

  /**
   * Get the JWT ID, that is, the <tt>jti</tt> claim, as described in RFC 7519 section 4.1.7.
   *
   * @returns the JWT ID, if present.
   * @see {@link https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.7 |RFC 7519 section 4.1.7}
   */
  get jwtId(): string | undefined {
    return this.getString('jti');
  }

  /**
   * Get the string claim with the given name.
   *
   * @param name - The name of the claim
   */
  getString(name: string): string | undefined {
    const value = this.metadata.asMap[JwtClaimPrefix + name];
    if (typeof value === 'string') {
      return value as string;
    }
    return undefined;
  }

  /**
   * Get the number claim with the given name.
   *
   * @param name - The name of the claim
   */
  getNumber(name: string): number | undefined {
    const value = this.getString(name);
    if (typeof value === 'string') {
      const n = parseFloat(value as string);
      if (!isNaN(n)) {
        return n;
      }
    }
    return undefined;
  }

  /**
   * Get the numeric date claim with the given name.
   *
   * Numeric dates are expressed as a number of seconds since epoch, as described in RFC 7519 section 2.
   *
   * @param name - The name of the claim
   * @see {@link https://datatracker.ietf.org/doc/html/rfc7519#section-2 |RFC 7519 section 2}
   */
  getNumericDate(name: string): Date | undefined {
    const value = this.getNumber(name);
    if (typeof value === 'number') {
      return new Date((value as number) * 1000);
    }
    return undefined;
  }

  /**
   * Get the boolean claim with the given name.
   *
   * @param name - The name of the claim
   */
  getBoolean(name: string): boolean | undefined {
    const value = this.getString(name);
    if (value === 'true') {
      return true;
    }
    if (value === 'false') {
      return false;
    }
    return undefined;
  }

  /**
   * Get the object claim with the given name.
   *
   * @param name - The name of the claim
   */
  getObject(name: string): any | undefined {
    const value = this.getString(name);
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value as string);
        if (typeof parsed === 'object') {
          return parsed;
        }
      } catch (e) {
        // error parsing, return undefined
      }
    }
    return undefined;
  }

  /**
   * Get the string array claim with the given name.
   *
   * @param name - The name of the claim
   */
  getStringArray(name: string): string[] | undefined {
    return this.getArray(name, (item: any) => typeof item === 'string');
  }

  /**
   * Get the number array claim with the given name.
   *
   * @param name - The name of the claim
   */
  getNumberArray(name: string): number[] | undefined {
    return this.getArray(name, (item: any) => typeof item === 'number');
  }

  /**
   * Get the boolean array claim with the given name.
   *
   * @param name - The name of the claim
   */
  getBooleanArray(name: string): boolean[] | undefined {
    return this.getArray(name, (item: any) => typeof item === 'boolean');
  }

  /**
   * Get the object array claim with the given name.
   *
   * @param name - The name of the claim
   */
  getObjectArray(name: string): any[] | undefined {
    return this.getArray(name, (item: any) => typeof item === 'object');
  }

  /**
   * Get the numeric date array claim with the given name.
   *
   * Numeric dates are expressed as a number of seconds since epoch, as described in RFC 7519 section 2.
   *
   * @param name - The name of the claim
   * @see {@link https://datatracker.ietf.org/doc/html/rfc7519#section-2 |RFC 7519 section 2}
   */
  getNumericDateArray(name: string): Date[] | undefined {
    const numbers = this.getNumberArray(name);
    if (numbers !== undefined) {
      return numbers.map((number) => new Date(number * 1000));
    }
    return undefined;
  }

  private getArray<T>(
    name: string,
    isT: (item: any) => boolean,
  ): T[] | undefined {
    const value = this.getString(name);
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value as string);
        if (Array.isArray(parsed)) {
          for (const item of parsed as Array<any>) {
            if (!isT(item)) {
              return undefined;
            }
          }
          return parsed as Array<T>;
        }
      } catch (e) {
        // error parsing, return undefined
      }
    }
    return undefined;
  }
}
