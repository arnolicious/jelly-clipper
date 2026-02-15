import { Schema } from 'effect';

export const BigIntFileSize = Schema.BigInt.pipe(Schema.brand('SizeInBytes'));

export const IntFileSize = Schema.Number.pipe(Schema.brand('SizeInBytes'));

export const FileInfoSchema = Schema.Struct({
	name: Schema.String,
	extension: Schema.String,
	size: BigIntFileSize
});

export type FileInfo = typeof FileInfoSchema.Type;
