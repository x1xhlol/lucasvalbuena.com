import * as migration_20261025_182133_baseline from './20261025_182133_baseline';

export const migrations = [
  {
    up: migration_20261025_182133_baseline.up,
    down: migration_20261025_182133_baseline.down,
    name: '20261025_182133_baseline',
  },
];
