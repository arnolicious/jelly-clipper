import { Schema } from 'effect';
import { OptionalBooleanOrNull, OptionalNumberOrNull, OptionalStringOrNull } from './BaseSchemas';
import type { MediaStream as OriginalMediaStream } from '@jellyfin/sdk/lib/generated-client/models';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type Reference = OriginalMediaStream;

const VideoRangeSchema = Schema.Any;

const VideoRangeTypeSchema = Schema.Any;

const AudioSpatialFormatSchema = Schema.Any;

const MediaStreamTypeSchema = Schema.Union(
	Schema.Literal('Audio'),
	Schema.Literal('Video'),
	Schema.Literal('Subtitle'),
	Schema.Literal('EmbeddedImage'),
	Schema.Literal('Data'),
	Schema.Literal('Lyric')
);

const SubtitleDeliveryMethodSchema = Schema.Any;

const _MediaStreamSchema = Schema.Struct({
	DisplayTitle: Schema.String,
	Codec: OptionalStringOrNull,
	CodecTag: OptionalStringOrNull,
	Language: OptionalStringOrNull,
	ColorRange: OptionalStringOrNull,
	ColorSpace: OptionalStringOrNull,
	ColorTransfer: OptionalStringOrNull,
	ColorPrimaries: OptionalStringOrNull,
	DvVersionMajor: OptionalNumberOrNull,
	DvVersionMinor: OptionalNumberOrNull,
	DvProfile: OptionalNumberOrNull,
	DvLevel: OptionalNumberOrNull,
	RpuPresentFlag: OptionalNumberOrNull,
	ElPresentFlag: OptionalNumberOrNull,
	BlPresentFlag: OptionalNumberOrNull,
	DvBlSignalCompatibilityId: OptionalNumberOrNull,
	Rotation: OptionalNumberOrNull,
	Comment: OptionalStringOrNull,
	TimeBase: OptionalStringOrNull,
	CodecTimeBase: OptionalStringOrNull,
	Title: OptionalStringOrNull,
	Hdr10PlusPresentFlag: OptionalBooleanOrNull,
	VideoRange: Schema.optional(VideoRangeSchema),
	VideoRangeType: Schema.optional(VideoRangeTypeSchema),
	VideoDoViTitle: OptionalStringOrNull,
	AudioSpatialFormat: Schema.optional(AudioSpatialFormatSchema),
	LocalizedUndefined: OptionalStringOrNull,
	LocalizedDefault: OptionalStringOrNull,
	LocalizedForced: OptionalStringOrNull,
	LocalizedExternal: OptionalStringOrNull,
	LocalizedHearingImpaired: OptionalStringOrNull,
	IsInterlaced: OptionalBooleanOrNull,
	IsAVC: OptionalBooleanOrNull,
	ChannelLayout: OptionalStringOrNull,
	BitRate: OptionalNumberOrNull,
	BitDepth: OptionalNumberOrNull,
	RefFrames: OptionalNumberOrNull,
	PacketLength: OptionalNumberOrNull,
	Channels: OptionalNumberOrNull,
	SampleRate: OptionalNumberOrNull,
	IsDefault: OptionalBooleanOrNull,
	IsForced: OptionalBooleanOrNull,
	IsHearingImpaired: OptionalBooleanOrNull,
	Height: OptionalNumberOrNull,
	Width: OptionalNumberOrNull,
	AverageFrameRate: OptionalNumberOrNull,
	RealFrameRate: OptionalNumberOrNull,
	ReferenceFrameRate: OptionalNumberOrNull,
	Profile: OptionalStringOrNull,
	Type: Schema.optional(MediaStreamTypeSchema),
	AspectRatio: OptionalStringOrNull,
	Index: Schema.Number,
	Score: OptionalNumberOrNull,
	IsExternal: OptionalBooleanOrNull,
	DeliveryMethod: Schema.optional(SubtitleDeliveryMethodSchema),
	DeliveryUrl: OptionalStringOrNull,
	IsExternalUrl: OptionalBooleanOrNull,
	IsTextSubtitleStream: OptionalBooleanOrNull,
	SupportsExternalStream: OptionalBooleanOrNull,
	Path: OptionalStringOrNull,
	PixelFormat: OptionalStringOrNull,
	Level: OptionalNumberOrNull,
	IsAnamorphic: OptionalBooleanOrNull
}).annotations({ identifier: 'MediaStream' });

// export type MediaStream = typeof MediaStreamSchema.Type;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface MediaStream extends Schema.Schema.Type<typeof _MediaStreamSchema> {}

export const MediaStreamSchema: Schema.Schema<MediaStream> = _MediaStreamSchema;
