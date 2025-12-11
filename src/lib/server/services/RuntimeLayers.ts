import { Layer, ManagedRuntime } from 'effect';
import { PrepareClipService } from './PrepareClipService';
import { JellyfinApiDependenciesLayer } from './JellyfinService';
import { JellyClipperConfigWithDbLayer } from './ConfigService';

export const UserAgnosticLayer = JellyClipperConfigWithDbLayer;

export const serverRuntime = ManagedRuntime.make(UserAgnosticLayer);

export const AuthenticatedUserLayer = PrepareClipService.layer.pipe(Layer.provideMerge(JellyfinApiDependenciesLayer));
