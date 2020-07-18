import redispkg from "redis"
import { Config } from "./config"

export let redis: redispkg.RedisClient // must call initializeRedis() before accessing

export function initializeRedis(config: Pick<Config, "redisHost" | "redisPort" | "redisTls">) {
	redis = redispkg.createClient({
		host: config.redisHost,
		port: config.redisPort,
		tls: config.redisTls,
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
}
