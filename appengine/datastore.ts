import { Datastore } from "@google-cloud/datastore"

export const newDatastore = (): Datastore => new Datastore()
