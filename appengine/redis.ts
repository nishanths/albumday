import redispkg from "redis"
import { Config } from "./config"

export function newRedis(config: Pick<Config, "redisHost" | "redisPort" | "redisTls">): RedisClient {
	const redis = redispkg.createClient({
		host: config.redisHost,
		port: config.redisPort,
		tls: config.redisTls,
		db: 0,
		retry_strategy: (opt) => {
			if (opt.attempt > 3) { return undefined }
			return 10
		},
	})

	redis.on("connect", e => {
		console.log("redis connect:", e)
	})

	redis.on("reconnecting", e => {
		console.log("redis reconnecting:", e)
	})

	redis.on("ready", e => {
		console.log("redis ready:", e)
	})

	redis.on("error", e => {
		console.error("redis error:", e)
	})

	redis.on("end", e => {
		console.log("redis end:", e)
	})

	redis.on("warning", e => {
		console.log("redis warning:", e)
	})

	return redis
}

export type RedisClient = redispkg.RedisClient

export const logRedisError = (err: redispkg.RedisError, message?: string): void => {
	if (message !== undefined) {
		console.error(`redis: ${message}: ${err.name}: ${err.message}`)
	} else {
		console.error(`redis: ${err.name}: ${err.message}`)
	}
}

export const updateEntity = <T>(redis: RedisClient, key: string, mutator: (entity: T) => T, desc = key): Promise<void> => {
	return new Promise((resolve, reject) => {
		// XXX: requires transaction
		redis.GET(key, (err, reply) => {
			if (err) {
				logRedisError(err, `get ${desc}`)
				reject()
				return
			}
			if (reply === null) {
				console.error(`unexpected null reply for ${desc}`)
				reject()
				return
			}

			let updatedEntityStr: string

			try {
				const entity = JSON.parse(reply) as T
				updatedEntityStr = JSON.stringify(mutator(entity))
			} catch (e) {
				console.error(`parse and mutate: ${desc}: ` + e)
				reject()
				return
			}

			redis.SET(key, updatedEntityStr, err => {
				if (err) {
					logRedisError(err, `set ${desc}`)
					reject()
					return
				}
				resolve()
			})
		})
	})
}
