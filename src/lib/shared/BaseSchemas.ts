import { Schema } from 'effect';

export const OptionalStringOrNull = Schema.optional(Schema.Union(Schema.String, Schema.Null));

export const OptionalNumberOrNull = Schema.optional(Schema.Union(Schema.Number, Schema.Null));

export const OptionalBooleanOrNull = Schema.optional(Schema.Union(Schema.Boolean, Schema.Null));
