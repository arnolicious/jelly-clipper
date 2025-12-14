import { Layer, Logger, ManagedRuntime } from 'effect';
import { ItemInfoService } from './ItemInfoService';
import { AnonymousJellyfinApiLayer, AuthedJellyfinApiLayer } from './JellyfinService';
import { JellyClipperConfigWithDbLayer } from './ConfigService';
import { ClipService } from './ClipService';
import { AssetNodeLayer } from './AssetService';
import { DownloadMediaServiceLive } from './DownloadMediaService';
import type { CurrentUser } from './CurrentUser';
import { CreateClipService } from './CreateClipService';
import { FfmpegLayer } from './AVService';

export const UserAgnosticLayer = Layer.mergeAll(
	Layer.provideMerge(FfmpegLayer, AssetNodeLayer),
	JellyClipperConfigWithDbLayer,
	AnonymousJellyfinApiLayer,
	Logger.pretty
);

export const serverRuntime = ManagedRuntime.make(UserAgnosticLayer);

export const AuthenticatedUserLayer = Layer.mergeAll(
	DownloadMediaServiceLive,
	CreateClipService.layer,
	ClipService.layer
).pipe(
	Layer.provideMerge(ItemInfoService.layer),
	Layer.provideMerge(AuthedJellyfinApiLayer),
	Layer.provideMerge(UserAgnosticLayer)
);

// Assert that the AuthenticatedUserLayer only requires the CurrentUser Layer
type AuthenticatedLayerRequirements = Layer.Layer.Context<typeof AuthenticatedUserLayer>;

type AssertCurrentUserLayer = AuthenticatedLayerRequirements extends CurrentUser ? true : false;

const _assertCurrentUserLayer: AssertCurrentUserLayer = true;
