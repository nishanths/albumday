import * as tls from "tls"
import * as fs from "fs"
import { env } from "./env"
import { assertExhaustive, OmitStrict } from "shared"
import { Datastore } from "@google-cloud/datastore"

export type Config = {
	redisHost: string
	redisPort: number
	redisTls?: RedisTLS
	sendgridAPIKey?: string
	spotifyClientID: string
	spotifyClientSecret: string
}

export type RedisTLS = {
	cert: Buffer
	key: Buffer
	ca: Buffer
	dhparam: Buffer
}

type Metadata = {
	redisHost: string
	sendgridAPIKey: string
	spotifyClientID: string
	spotifyClientSecret: string
}

export const loadConfig = async (ds: Datastore): Promise<Config> => {
	const e = env()

	switch (e) {
		case "prod":
			const key = ds.key(["Metadata", "singleton"])
			const data = await ds.get(key)
			const m = data[0] as Metadata

			return {
				redisHost: m.redisHost,
				redisPort: 6379,
				redisTls: {
					cert: fs.readFileSync("redis/tls/redis.crt"),
					key: fs.readFileSync("redis/tls/redis.key"),
					ca: fs.readFileSync("redis/tls/ca.crt"),
					dhparam: fs.readFileSync("redis/tls/redis.dh"),
				},
				sendgridAPIKey: m.sendgridAPIKey,
				spotifyClientID: m.spotifyClientID,
				spotifyClientSecret: m.spotifyClientSecret,
			}

		case "dev":
			const devsecrets = await import("./devsecrets")
			return {
				redisHost: "localhost",
				redisPort: 6379,
				spotifyClientID: devsecrets.default.spotifyClientID,
				spotifyClientSecret: devsecrets.default.spotifyClientSecret,
			}

		default:
			assertExhaustive(e)
	}
}

