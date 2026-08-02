import { Layer, ManagedRuntime } from 'effect';
import { AnonymousJellyfinApi, JellyfinApi } from './JellyfinService';
import { JellyClipperConfig } from './ConfigService';
import { ClipService } from './ClipService';
import { DownloadMediaService } from './DownloadMediaService';
import { CreateClipService } from './CreateClipService';
import { AVService } from './AVService';
import { AssetService } from './AssetService';
import { DownloadManager } from './DownloadManagerService';
import { DatabaseService } from './DatabaseService';
import { FetchHttpClient } from '@effect/platform';
import { LibraryService } from './LibraryService';
import { NodeContext } from '@effect/platform-node';
import { LoggerLayer } from './LoggerLayer';
import { ClipMediaPreparationService } from './ClipMediaPreparationService';

// User-Agnostic Layers
const AnonymousJellyfinApiLayer = AnonymousJellyfinApi.Default;
const AssetServiceLayer = AssetService.NodeLayer;
const AvServiceLayer = AVService.FfmpegLayer.pipe(Layer.provide(AssetServiceLayer));
const DatabaseServiceLayer = DatabaseService.Default;
const ConfigLayer = JellyClipperConfig.Default.pipe(Layer.provide(DatabaseServiceLayer));
const DownloadManagerLayer = DownloadManager.Default;
const LibraryServiceLayer = LibraryService.Default.pipe(
	Layer.provide(NodeContext.layer),
	Layer.provide(AssetServiceLayer)
);

export const UserAgnosticLayer = Layer.mergeAll(
	DownloadManagerLayer,
	DatabaseServiceLayer,
	AssetServiceLayer,
	AnonymousJellyfinApiLayer,
	LibraryServiceLayer,
	ConfigLayer
).pipe(Layer.provide(LoggerLayer), Layer.provideMerge(AvServiceLayer));

// Authenticated User Layers
const AuthedJellyfinApiLayer = JellyfinApi.Default;
const ClipServiceLayer = ClipService.Default;
const CreateClipServiceLayer = CreateClipService.Default;
const DownloadMediaServiceLayer = DownloadMediaService.Default.pipe(Layer.provide(FetchHttpClient.layer));
const ClipMediaPreparationServiceLayer = ClipMediaPreparationService.Default;

const AuthenticatedServiceLayer = Layer.mergeAll(
	DownloadMediaServiceLayer,
	ClipMediaPreparationServiceLayer,
	CreateClipServiceLayer,
	ClipServiceLayer
);

export const AuthenticatedUserLayer = Layer.provideMerge(AuthenticatedServiceLayer, AuthedJellyfinApiLayer);

export const serverRuntime = ManagedRuntime.make(UserAgnosticLayer);
