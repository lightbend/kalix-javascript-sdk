import pkg from '../package.json';

export class PackageInfo {
  readonly name: string;
  readonly version: string;

  constructor() {
    this.name = pkg.name || 'unknown';
    this.version = pkg.version || '0.0.0.0';
  }
}
