import * as tls from "tls"
import { env } from "./env"
import { assertExhaustive, OmitStrict } from "shared/typeutil"

export type Config = {
	redisHost: string
	redisPort: number
	redisTls?: RedisTLS
}

export type RedisTLS = {
	cert: string
	key: string
	ca: string
	dhparam: string
}

const devConfig: Config = {
	redisHost: "localhost",
	redisPort: 6379,
}

const partialProdConfig: OmitStrict<Config, "redisHost"> = {
	redisPort: 6379,
	redisTls: {
		cert: "redis/tls/redis.crt",
		key: "redis/tls/redis.key",
		ca: "redis/tls/ca.crt",
		dhparam: "redis/tls/redis.dh",
	},
}

const loadConfig = (): Config => {
	const e = env()

	switch (e) {
		case "prod":
			return {
				...partialProdConfig,
				redisHost: "", // TODO datastore
			}
		case "dev":
			return devConfig
		default:
			assertExhaustive(e)
	}
}

export const config = loadConfig()
