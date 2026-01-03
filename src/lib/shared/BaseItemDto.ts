import { Schema } from 'effect';
import { OptionalBooleanOrNull, OptionalNumberOrNull, OptionalStringOrNull } from './BaseSchemas';
import type { BaseItemDto as OriginalBaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import { MediaStreamSchema } from './MediaStream';
import { MediaSourceSchema } from './MediaSource';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type Reference = OriginalBaseItemDto;

const ExtraTypeSchema = Schema.Any;

const Video3DFormatSchema = Schema.Any;

const ExternalUrlSchema = Schema.Any;

const PlayAccessSchema = Schema.Any;

const MediaUrlSchema = Schema.Any;

const BaseItemKindSchema = Schema.Any;

const BaseItemPersonSchema = Schema.Any;

const NameGuidPairSchema = Schema.Any;

const UserItemDataDtoSchema = Schema.Any;

const DayOfWeekSchema = Schema.Any;

const CollectionTypeSchema = Schema.Any;

const VideoTypeSchema = Schema.Any;

const BaseItemDtoImageBlurHashesSchema = Schema.Any;

const ChapterInfoSchema = Schema.Any;

const TrickplayInfoDtoSchema = Schema.Any;

const LocationTypeSchema = Schema.Any;

const IsoTypeSchema = Schema.Any;

const MediaTypeSchema = Schema.Any;

const MetadataFieldSchema = Schema.Any;

const ImageOrientationSchema = Schema.Any;

const ChannelTypeSchema = Schema.Any;

const ProgramAudioSchema = Schema.Any;

const BaseItemDtoFields = {
	Name: OptionalStringOrNull,
	OriginalTitle: OptionalStringOrNull,
	ServerId: OptionalStringOrNull,
	Id: Schema.String,
	Etag: OptionalStringOrNull,
	SourceType: OptionalStringOrNull,
	PlaylistItemId: OptionalStringOrNull,
	DateCreated: OptionalStringOrNull,
	DateLastMediaAdded: OptionalStringOrNull,
	ExtraType: Schema.optional(ExtraTypeSchema),
	AirsBeforeEpisodeNumber: OptionalNumberOrNull,
	AirsAfterSeasonNumber: OptionalNumberOrNull,
	CanDelete: OptionalBooleanOrNull,
	CanDownload: OptionalBooleanOrNull,
	HasLyrics: OptionalBooleanOrNull,
	HasSubtitles: OptionalBooleanOrNull,
	PreferredMetadataLanguage: OptionalStringOrNull,
	PreferredMetadataCountryCode: OptionalStringOrNull,
	Container: OptionalStringOrNull,
	SortName: OptionalStringOrNull,
	ForcedSortName: OptionalStringOrNull,
	Video3DFormat: Schema.optional(Video3DFormatSchema),
	PremiereDate: OptionalStringOrNull,
	ExternalUrls: Schema.optional(Schema.Union(Schema.Array(ExternalUrlSchema), Schema.Null)),
	MediaSources: Schema.Array(MediaSourceSchema).pipe(Schema.itemsCount(1)),
	CriticRating: OptionalNumberOrNull,
	ProductionLocations: Schema.optional(Schema.Union(Schema.Array(Schema.String), Schema.Null)),
	Path: OptionalStringOrNull,
	EnableMediaSourceDisplay: OptionalBooleanOrNull,
	OfficialRating: OptionalStringOrNull,
	CustomRating: OptionalStringOrNull,
	ChannelId: OptionalStringOrNull,
	ChannelName: OptionalStringOrNull,
	Overview: OptionalStringOrNull,
	Taglines: Schema.optional(Schema.Union(Schema.Array(Schema.String), Schema.Null)),
	Genres: Schema.optional(Schema.Union(Schema.Array(Schema.String), Schema.Null)),
	CommunityRating: OptionalNumberOrNull,
	CumulativeRunTimeTicks: OptionalNumberOrNull,
	RunTimeTicks: OptionalNumberOrNull,
	PlayAccess: Schema.optional(PlayAccessSchema),
	AspectRatio: OptionalStringOrNull,
	ProductionYear: OptionalNumberOrNull,
	IsPlaceHolder: OptionalBooleanOrNull,
	Number: OptionalStringOrNull,
	ChannelNumber: OptionalStringOrNull,
	IndexNumber: OptionalNumberOrNull,
	IndexNumberEnd: OptionalNumberOrNull,
	ParentIndexNumber: OptionalNumberOrNull,
	RemoteTrailers: Schema.optional(Schema.Union(Schema.Array(MediaUrlSchema), Schema.Null)),
	ProviderIds: Schema.optional(
		Schema.Union(Schema.Record({ key: Schema.String, value: Schema.Union(Schema.String, Schema.Null) }), Schema.Null)
	),
	IsHD: OptionalBooleanOrNull,
	IsFolder: OptionalBooleanOrNull,
	ParentId: OptionalStringOrNull,
	Type: Schema.optional(BaseItemKindSchema),
	People: Schema.optional(Schema.Union(Schema.Array(BaseItemPersonSchema), Schema.Null)),
	Studios: Schema.optional(Schema.Union(Schema.Array(NameGuidPairSchema), Schema.Null)),
	GenreItems: Schema.optional(Schema.Union(Schema.Array(NameGuidPairSchema), Schema.Null)),
	ParentLogoItemId: OptionalStringOrNull,
	ParentBackdropItemId: OptionalStringOrNull,
	ParentBackdropImageTags: Schema.optional(Schema.Union(Schema.Array(Schema.String), Schema.Null)),
	LocalTrailerCount: OptionalNumberOrNull,
	UserData: Schema.optional(UserItemDataDtoSchema),
	RecursiveItemCount: OptionalNumberOrNull,
	ChildCount: OptionalNumberOrNull,
	SeriesName: OptionalStringOrNull,
	SeriesId: OptionalStringOrNull,
	SeasonId: OptionalStringOrNull,
	SpecialFeatureCount: OptionalNumberOrNull,
	DisplayPreferencesId: OptionalStringOrNull,
	Status: OptionalStringOrNull,
	AirTime: OptionalStringOrNull,
	AirDays: Schema.optional(Schema.Union(Schema.Array(DayOfWeekSchema), Schema.Null)),
	Tags: Schema.optional(Schema.Union(Schema.Array(Schema.String), Schema.Null)),
	PrimaryImageAspectRatio: OptionalNumberOrNull,
	Artists: Schema.optional(Schema.Union(Schema.Array(Schema.String), Schema.Null)),
	ArtistItems: Schema.optional(Schema.Union(Schema.Array(NameGuidPairSchema), Schema.Null)),
	Album: OptionalStringOrNull,
	CollectionType: Schema.optional(CollectionTypeSchema),
	DisplayOrder: OptionalStringOrNull,
	AlbumId: OptionalStringOrNull,
	AlbumPrimaryImageTag: OptionalStringOrNull,
	SeriesPrimaryImageTag: OptionalStringOrNull,
	AlbumArtist: OptionalStringOrNull,
	AlbumArtists: Schema.optional(Schema.Union(Schema.Array(NameGuidPairSchema), Schema.Null)),
	SeasonName: OptionalStringOrNull,
	MediaStreams: Schema.Array(MediaStreamSchema),
	VideoType: Schema.optional(VideoTypeSchema),
	PartCount: OptionalNumberOrNull,
	MediaSourceCount: OptionalNumberOrNull,
	ImageTags: Schema.optional(Schema.Union(Schema.Record({ key: Schema.String, value: Schema.String }), Schema.Null)),
	BackdropImageTags: Schema.optional(Schema.Union(Schema.Array(Schema.String), Schema.Null)),
	ScreenshotImageTags: Schema.optional(Schema.Union(Schema.Array(Schema.String), Schema.Null)),
	ParentLogoImageTag: OptionalStringOrNull,
	ParentArtItemId: OptionalStringOrNull,
	ParentArtImageTag: OptionalStringOrNull,
	SeriesThumbImageTag: OptionalStringOrNull,
	ImageBlurHashes: Schema.optional(BaseItemDtoImageBlurHashesSchema),
	SeriesStudio: OptionalStringOrNull,
	ParentThumbItemId: OptionalStringOrNull,
	ParentThumbImageTag: OptionalStringOrNull,
	ParentPrimaryImageItemId: OptionalStringOrNull,
	ParentPrimaryImageTag: OptionalStringOrNull,
	Chapters: Schema.optional(Schema.Union(Schema.Array(ChapterInfoSchema), Schema.Null)),
	Trickplay: Schema.optional(
		Schema.Union(
			Schema.Record({
				key: Schema.String,
				value: Schema.Record({
					key: Schema.String,
					value: TrickplayInfoDtoSchema
				})
			}),
			Schema.Null
		)
	),
	LocationType: Schema.optional(LocationTypeSchema),
	IsoType: Schema.optional(IsoTypeSchema),
	MediaType: Schema.optional(MediaTypeSchema),
	EndDate: OptionalStringOrNull,
	LockedFields: Schema.optional(Schema.Union(Schema.Array(MetadataFieldSchema), Schema.Null)),
	TrailerCount: OptionalNumberOrNull,
	MovieCount: OptionalNumberOrNull,
	SeriesCount: OptionalNumberOrNull,
	ProgramCount: OptionalNumberOrNull,
	EpisodeCount: OptionalNumberOrNull,
	SongCount: OptionalNumberOrNull,
	AlbumCount: OptionalNumberOrNull,
	ArtistCount: OptionalNumberOrNull,
	MusicVideoCount: OptionalNumberOrNull,
	LockData: OptionalBooleanOrNull,
	Width: OptionalNumberOrNull,
	Height: OptionalNumberOrNull,
	CameraMake: OptionalStringOrNull,
	CameraModel: OptionalStringOrNull,
	Software: OptionalStringOrNull,
	ExposureTime: OptionalNumberOrNull,
	FocalLength: OptionalNumberOrNull,
	ImageOrientation: Schema.optional(ImageOrientationSchema),
	Aperture: OptionalNumberOrNull,
	ShutterSpeed: OptionalNumberOrNull,
	Latitude: OptionalNumberOrNull,
	Longitude: OptionalNumberOrNull,
	Altitude: OptionalNumberOrNull,
	IsoSpeedRating: OptionalNumberOrNull,
	SeriesTimerId: OptionalStringOrNull,
	ProgramId: OptionalStringOrNull,
	ChannelPrimaryImageTag: OptionalStringOrNull,
	StartDate: OptionalStringOrNull,
	CompletionPercentage: OptionalNumberOrNull,
	IsRepeat: OptionalBooleanOrNull,
	EpisodeTitle: OptionalStringOrNull,
	ChannelType: Schema.optional(ChannelTypeSchema),
	Audio: Schema.optional(ProgramAudioSchema),
	IsMovie: OptionalBooleanOrNull,
	IsSports: OptionalBooleanOrNull,
	IsSeries: OptionalBooleanOrNull,
	IsLive: OptionalBooleanOrNull,
	IsNews: OptionalBooleanOrNull,
	IsKids: OptionalBooleanOrNull,
	IsPremiere: OptionalBooleanOrNull,
	TimerId: OptionalStringOrNull,
	NormalizationGain: OptionalNumberOrNull
};

// Do this to make the type opaque

interface _BaseItemDto extends Schema.Struct.Type<typeof BaseItemDtoFields> {
	readonly CurrentProgram?: _BaseItemDto;
}

const _BaseItemDtoSchema = Schema.Struct({
	...BaseItemDtoFields,
	CurrentProgram: Schema.optional(Schema.suspend((): Schema.Schema<_BaseItemDto> => _BaseItemDtoSchema))
}).annotations({ identifier: 'BaseItemDto' });

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface BaseItemDto extends Schema.Schema.Type<typeof _BaseItemDtoSchema> {}

export const BaseItemDtoSchema: Schema.Schema<BaseItemDto> = _BaseItemDtoSchema;
