package main

import (
	"context"

	"cloud.google.com/go/datastore"
)

func newDatastore(ctx context.Context) *datastore.Client {
	if env() != Dev {
		ds, err := datastore.NewClient(ctx, ProjectID)
		if err != nil {
			panic(err)
		}
		return ds
	}
	return nil
}
