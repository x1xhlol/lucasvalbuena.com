import * as migration_20261025_182133_baseline from './20261025_182133_baseline';
import * as migration_20261103_122303_newsletter from './20261103_122303_newsletter';

export const migrations = [
  {
    up: migration_20261025_182133_baseline.up,
    down: migration_20261025_182133_baseline.down,
    name: '20261025_182133_baseline',
  },
  {
    up: migration_20261103_122303_newsletter.up,
    down: migration_20261103_122303_newsletter.down,
    name: '20261103_122303_newsletter'
  },
];
