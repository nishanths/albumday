import { RedisClient, logRedisError } from "./redis"
import { Service } from "shared"
import { Song } from "./music-service"

const libraryCacheExpirySeconds = 48 * 60 * 60 // 48 hours

export function libraryCacheKey(s: Service, email: string): string {
	return `:library:${s}:${email}`
}

export async function putSongsToCache(redis: RedisClient, key: string, songs: Song[]): Promise<void> {
	const value = JSON.stringify(songs)

	return new Promise((resolve, reject) => {
		redis.SETEX(key, libraryCacheExpirySeconds, value, err => {
			if (err) {
				logRedisError(err, "put songs to cache: " + key)
				reject(err)
				return
			}
			resolve()
		})
	})
}

export async function getSongsFromCache(redis: RedisClient, key: string): Promise<Song[] | null> {
	return new Promise((resolve, reject) => {
		redis.GET(key, (err, reply) => {
			if (err) {
				logRedisError(err, "get songs from cache: " + key)
				reject(err)
				return
			}
			if (reply === null) {
				resolve(null)
				return
			}
			resolve(JSON.parse(reply) as Song[])
		})
	})
}
