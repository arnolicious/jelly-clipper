import { PersistedState } from 'runed';
import { Schema } from 'effect';

export const PlayerVolumeSchema = Schema.Number.pipe(
	Schema.greaterThanOrEqualTo(0),
	Schema.lessThanOrEqualTo(1),
	Schema.brand('PlayerVolume')
);

export type PlayerVolume = typeof PlayerVolumeSchema.Type;

export const playerVolume = new PersistedState<PlayerVolume>('player-volume', PlayerVolumeSchema.make(1));
