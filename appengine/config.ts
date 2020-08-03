import * as tls from "tls"
import * as fs from "fs"
import { Env } from "./env"
import { assertExhaustive } from "shared"
import { Datastore } from "@google-cloud/datastore"
import { promisify } from "util"

const readFile = promisify(fs.readFile)

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

			const redisFiles = await Promise.all([
				readFile("redis/tls/redis.crt"),
				readFile("redis/tls/redis.key"),
				readFile("redis/tls/ca.crt"),
				readFile("redis/tls/redis.dh"),
			])

			return {
				redisHost: m.redisHost,
				redisPort: 6379,
				redisTls: {
					cert: redisFiles[0],
					key: redisFiles[1],
					ca: redisFiles[2],
					dhparam: redisFiles[3],
				},
				sendgridAPIKey: m.sendgridAPIKey,
				spotifyClientID: m.spotifyClientID,
				spotifyClientSecret: m.spotifyClientSecret,
				cookieSecret: m.cookieSecret,
			}

		case "dev":
			const spotifyClientID = process.env["SPOTIFY_CLIENT_ID"] || ""
			const spotifyClientSecret = process.env["SPOTIFY_CLIENT_SECRET"] || ""

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

