import * as tls from "tls"
import { env } from "./env"
import { assertExhaustive, OmitStrict } from "shared"
import { Datastore } from "@google-cloud/datastore"

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

type Metadata = {
	redisHost: string
}

export const loadConfig = async (ds: Datastore): Promise<Config> => {
	const e = env()

	switch (e) {
		case "prod":
			const key = ds.key(["Metadata", "singleton"])
			const data = await ds.get(key)
			const m = data[0] as Metadata

			return {
				...partialProdConfig,
				redisHost: m.redisHost,
			}

		case "dev":
			return devConfig

		default:
			assertExhaustive(e)
	}
}

