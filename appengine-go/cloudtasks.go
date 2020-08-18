package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	cloudtasks "cloud.google.com/go/cloudtasks/apiv2"
	"google.golang.org/genproto/googleapis/cloud/tasks/v2"
)

const queueName = "internal-default"

const headerTasksSecret = "x-tasks-secret"

type TasksClient interface {
	PostJSONTask(ctx context.Context, path string, payload interface{}) error
	Close() error

	tasksSecret() string
}

type CloudTasksClient struct {
	tasks  *cloudtasks.Client
	secret string
}

func (c *CloudTasksClient) PostJSONTask(ctx context.Context, path string, payload interface{}) error {
	p, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("json-marshal payload: %s", err)
	}

	task := &tasks.CreateTaskRequest{
		Parent: queueName,
		Task: &tasks.Task{
			MessageType: &tasks.Task_AppEngineHttpRequest{
				AppEngineHttpRequest: &tasks.AppEngineHttpRequest{
					HttpMethod:  tasks.HttpMethod_POST,
					RelativeUri: path,
					Headers:     map[string]string{headerTasksSecret: c.tasksSecret()},
					Body:        p,
				},
			},
		},
	}

	_, err = c.tasks.CreateTask(ctx, task)
	return err
}

func (c *CloudTasksClient) Close() error {
	return c.tasks.Close()
}

func (c *CloudTasksClient) tasksSecret() string {
	return c.secret
}

type DevTasksClient struct {
	http   *http.Client
	secret string
}

func (c *DevTasksClient) PostJSONTask(ctx context.Context, path string, payload interface{}) error {
	return fmt.Errorf("not implemented")
}

func (c *DevTasksClient) Close() error {
	return nil // nothing to do
}

func (c *DevTasksClient) tasksSecret() string {
	return c.secret
}

var _ TasksClient = (*CloudTasksClient)(nil)
var _ TasksClient = (*DevTasksClient)(nil)

func newTasksClient(ctx context.Context, tasksSecret string) (TasksClient, error) {
	switch env() {
	case Dev:
		return &DevTasksClient{
			http:   http.DefaultClient,
			secret: tasksSecret,
		}, nil
	case Prod:
		tasks, err := cloudtasks.NewClient(ctx)
		return &CloudTasksClient{
			tasks:  tasks,
			secret: tasksSecret,
		}, err
	default:
		panic("unreachable")
	}
}
