import { Config, Effect, Layer, Logger, LogLevel } from 'effect';

const LogLevelLive = Config.logLevel('LOG_LEVEL').pipe(
	Config.withDefault(LogLevel.Info),
	Effect.andThen((level) => Logger.minimumLogLevel(level)),
	Layer.unwrapEffect
);

const PrettyLoggerLive = Logger.pretty;

export const LoggerLayer = Layer.mergeAll(LogLevelLive, PrettyLoggerLive);
