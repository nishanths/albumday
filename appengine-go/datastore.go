package main

import (
	"context"

	"cloud.google.com/go/datastore"
)

func newDatastore(ctx context.Context) (*datastore.Client, error) {
	if env() != Dev {
		return datastore.NewClient(ctx, ProjectID)
	}
	return nil, nil
}
