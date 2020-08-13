package main

import (
	"context"
	"encoding/json"
	"fmt"

	cloudtasks "cloud.google.com/go/cloudtasks/apiv2"
	"google.golang.org/genproto/googleapis/cloud/tasks/v2"
)

const DefaultQueueName = "default"

const headerTasksSecret = "x-tasks-secret"

func newTasks(ctx context.Context) *cloudtasks.Client {
	switch env() {
	case Dev:
		return nil
	case Prod:
		c, err := cloudtasks.NewClient(ctx)
		if err != nil {
			panic(err)
		}
		return c
	default:
		panic("unreachable")
	}
}

func postJSONTask(ctx context.Context, client *cloudtasks.Client, path string, payload interface{}, secret string) error {
	switch env() {
	case Prod:
		return postJSONTaskProd(ctx, client, path, payload, secret)
	case Dev:
		return postJSONTaskDev(ctx, path, payload, secret)
	default:
		panic("unreachable")
	}
}

func postJSONTaskDev(ctx context.Context, path string, payload interface{}, secret string) error {
	return fmt.Errorf("not implemented")
}

func postJSONTaskProd(ctx context.Context, client *cloudtasks.Client, path string, payload interface{}, secret string) error {
	p, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("json-marshal payload: %s", err)
	}

	task := &tasks.CreateTaskRequest{
		Parent: DefaultQueueName,
		Task: &tasks.Task{
			MessageType: &tasks.Task_AppEngineHttpRequest{
				AppEngineHttpRequest: &tasks.AppEngineHttpRequest{
					HttpMethod:  tasks.HttpMethod_POST,
					RelativeUri: path,
					Headers:     map[string]string{headerTasksSecret: secret},
					Body:        p,
				},
			},
		},
	}

	_, err = client.CreateTask(ctx, task)
	return err
}
