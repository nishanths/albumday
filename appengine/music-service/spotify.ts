import { Connection, ConnectionError, SpotifyConnection } from "shared"
import { MusicService, Song } from "./shared"

const fetch = async (conn: SpotifyConnection): Promise<any[]> => {
	return []
}

const transform = (songs: any[]): Song[] => {
	return []
}

export const spotifyService: MusicService<SpotifyConnection, any> = {
	fetch,
	transform,
}
