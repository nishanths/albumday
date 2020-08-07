import { scrobbleService } from "./scrobble"
import { spotifyService } from "./spotify"
import { MusicService } from "./shared"
import { Service, assertExhaustive, KnownConnection } from "shared"

export function musicService(s: Service): MusicService<KnownConnection, unknown> {
	switch (s) {
		case "spotify":
			return spotifyService as MusicService<KnownConnection, unknown>
		case "scrobble":
			return scrobbleService as MusicService<KnownConnection, unknown>
		default:
			assertExhaustive(s)
	}
}

export { Song } from "./shared"
