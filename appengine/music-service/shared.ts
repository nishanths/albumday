import { KnownConnection } from "shared"

export type Song = {
	artist: string | null
	album: string | null
	title: string | null

	released: ReleaseDate | null

	link: string | null
	albumLink: string | null
	artworkURL: string | null

	playCount: number | null
	loved: boolean | null
}

export type ReleaseDate = {
	year: number | null
	month: number | null
	day: number | null
}

export interface MusicService<Conn extends KnownConnection, T> {
	fetch: (conn: Conn) => Promise<T>
	transform: (t: T) => Song[]
}
