package main

import (
	"context"
	"net/http"
	"time"
)

type Album struct {
	Artist       string
	Album        string
	Release      ReleaseDate
	Link         *string
	ReleaseMatch ReleaseMatch
}

type FullDate struct {
	Year  int
	Month time.Month
	Day   int
}

type BirthdayItem struct {
	Album
	ArtworkURL *string
	Songs      []struct {
		Title string
		Link  *string
	}
}

type ReleaseMatch string

const (
	MatchNone  ReleaseMatch = "none"
	MatchDay   ReleaseMatch = "day"
	MatchMonth ReleaseMatch = "month"
)

func matchRelease(target FullDate, d ReleaseDate) ReleaseMatch {
	if d.Day != nil {
		if target.Day == *d.Day && target.Month == d.Month {
			return MatchDay
		}
		return MatchNone
	}
	if target.Month == d.Month && target.Day == 1 {
		return MatchMonth
	}
	return MatchNone
}

func computeBirthdays(ctx context.Context, client *http.Client, timestamp int64, loc *time.Location, songs []Song) []BirthdayItem {
	return nil
}
