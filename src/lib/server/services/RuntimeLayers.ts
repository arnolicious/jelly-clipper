import { Layer, Logger, LogLevel, ManagedRuntime } from 'effect';
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

// User-Agnostic Layers
const AnonymousJellyfinApiLayer = AnonymousJellyfinApi.Default;
const AssetServiceLayer = AssetService.NodeLayer;
const AvServiceLayer = AVService.FfmpegLayer.pipe(Layer.provide(AssetServiceLayer));
const DatabaseServiceLayer = DatabaseService.Default;
const ConfigLayer = JellyClipperConfig.Default.pipe(Layer.provide(DatabaseServiceLayer));
const LoggingLayer = Layer.mergeAll(Logger.pretty, Logger.minimumLogLevel(LogLevel.Debug));
const DownloadManagerLayer = DownloadManager.Default;

export const UserAgnosticLayer = Layer.mergeAll(
	DownloadManagerLayer,
	DatabaseServiceLayer,
	AssetServiceLayer,
	AvServiceLayer,
	AnonymousJellyfinApiLayer,
	ConfigLayer
).pipe(Layer.provide(LoggingLayer));

// Authenticated User Layers
const AuthedJellyfinApiLayer = JellyfinApi.Default;
const ClipServiceLayer = ClipService.Default;
const CreateClipServiceLayer = CreateClipService.Default;
const DownloadMediaServiceLayer = DownloadMediaService.Default.pipe(Layer.provide(FetchHttpClient.layer));

export const AuthenticatedUserLayer = Layer.mergeAll(
	AuthedJellyfinApiLayer,
	DownloadMediaServiceLayer,
	CreateClipServiceLayer,
	ClipServiceLayer
).pipe(Layer.provide(AuthedJellyfinApiLayer));

export const serverRuntime = ManagedRuntime.make(UserAgnosticLayer);
