import * as tls from "tls"
import * as fs from "fs"
import { Env } from "./env"
import { assertExhaustive } from "shared"
import { Datastore } from "@google-cloud/datastore"

export type Config = {
	redisHost: string
	redisPort: number
	redisTls?: RedisTLS
	sendgridAPIKey?: string
	spotifyClientID: string
	spotifyClientSecret: string
	cookieSecret: string
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
	cookieSecret: string
}

export const loadConfig = async (e: Env, ds: Datastore): Promise<Config> => {
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
				cookieSecret: m.cookieSecret,
			}

		case "dev":
			const spotifyClientID = process.env["SPOTIFY_CLIENT_ID"]!
			const spotifyClientSecret = process.env["SPOTIFY_CLIENT_SECRET"]!

			return {
				redisHost: "localhost",
				redisPort: 6379,
				spotifyClientID,
				spotifyClientSecret,
				cookieSecret: "foo",
			}

		default:
			assertExhaustive(e)
	}
}

