package main

import (
	"fmt"
	"io"
	"os"

	"github.com/sendgrid/sendgrid-go"
	"github.com/sendgrid/sendgrid-go/helpers/mail"
)

const fromName = AppName
const fromEmail = "hardworkingbot@gmail.com"

type EmailClient interface {
	Send(to []string, subject string, bodyText string, bodyHTML string) error
}

type SendgridClient struct {
	sendgrid *sendgrid.Client
}

func (s *SendgridClient) Send(to []string, subject string, bodyText string, bodyHTML string) error {
	m := new(mail.SGMailV3)
	m.SetFrom(mail.NewEmail(fromName, fromEmail))

	p := mail.NewPersonalization()
	for i := range to {
		p.AddTos(mail.NewEmail("", to[i]))
	}
	m.AddPersonalizations(p)

	m.Subject = subject
	if bodyText != "" {
		m.AddContent(mail.NewContent("text/plain", bodyText))
	} else {
		m.AddContent(mail.NewContent("text/html", bodyHTML))
	}

	rsp, err := s.sendgrid.Send(m)
	if err != nil {
		return fmt.Errorf("failed to send email: %s", err)
	}
	// https://sendgrid.com/docs/API_Reference/Web_API_v3/Mail/errors.html
	if rsp.StatusCode != 200 && rsp.StatusCode != 202 {
		return fmt.Errorf("bad status code %d; body: %s", rsp.StatusCode, rsp.Body)
	}
	return nil
}

type LoggingEmailClient struct {
	w io.Writer
}

func (l *LoggingEmailClient) Send(to []string, subject string, bodyText string, bodyHTML string) error {
	fmt.Fprintf(l.w, "email: to: %v", to)
	fmt.Fprintf(l.w, "email: subject: %s", subject)
	fmt.Fprintf(l.w, "email: body text: %s", bodyText)
	fmt.Fprintf(l.w, "email: body html: %s", bodyHTML)
	return nil
}

func newEmailClient(sendgridAPIKey string) EmailClient {
	switch env() {
	case Prod:
		return &SendgridClient{
			sendgrid: sendgrid.NewSendClient(sendgridAPIKey),
		}
	case Dev:
		return &LoggingEmailClient{w: os.Stdout}
	default:
		panic("should not be reachable")
	}
}