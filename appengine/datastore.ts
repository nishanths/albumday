import { Datastore } from "@google-cloud/datastore"
import { env } from "./env"

export const newDatastore = (): Datastore | null => env() !== "dev" ? new Datastore() : null
