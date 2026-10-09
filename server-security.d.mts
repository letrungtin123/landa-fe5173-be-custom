// Types for server-security.mjs (used by vite.config.ts and server.js).
export declare function appendForwardedFor(existing: string | string[] | undefined, peerAddress: string | undefined): string | undefined;
export declare const DEFAULT_FRAMEABLE_PATHS: readonly string[];
export declare function parseFrameablePaths(raw: string | undefined): string[];
export declare function isFrameablePath(pathname: string, frameablePaths: readonly string[]): boolean;
export declare function securityHeadersFor(pathname: string, frameablePaths?: readonly string[]): Record<string, string>;
export declare function requestPathname(url: string | undefined): string;
