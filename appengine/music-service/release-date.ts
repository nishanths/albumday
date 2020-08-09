import { Temporal } from "proposal-temporal"
import { ReleaseDate } from "./shared"
import { secondsToNano } from "shared"

// TODO: add more
const timeZoneNames = [
	// "America/Anchorage",
	"America/Chicago",
	// "America/Costa_Rica",
	"America/Denver",
	// "America/Detroit",
	// "America/Edmonton",
	// "America/Halifax",
	"America/Los_Angeles",
	"America/New_York",
	"America/Phoenix",
	// "America/Cancun",
	"Asia/Calcutta",
	// "Asia/Hong_Kong",
	"Etc/GMT",
	// "Etc/UTC",
	// "Europe/Paris",
	// "Europe/Berlin",
	// "Europe/Minsk",
	// "Europe/Madrid",
	// "Australia/Adelaide",
	// "Australia/Brisbane",
	// "Australia/Canberra",
	// "Australia/Darwin",
	// "Australia/Hobart",
	// "Australia/Perth",
	// "Australia/Sydney",
	// "Pacific/Auckland",
	// "Pacific/Chatham",
	// "Asia/Tokyo",
]

const timeZones = timeZoneNames.map(t => new Temporal.TimeZone(t))

const gmtTimeZone = new Temporal.TimeZone("Etc/GMT")

const defaultTimeZone = gmtTimeZone

export function determineReleaseDate(unixSec: number): ReleaseDate {
	const unixNano = secondsToNano(unixSec as unknown as bigint)
	const abs = new Temporal.Absolute(unixNano)

	for (const tz of timeZones) {
		const t = abs.toDateTime(tz)
		if ((t.hour === 0 && t.minute === 0) || (t.hour === 12 && t.minute === 0)) {
			return {
				year: t.year,
				month: t.month,
				day: t.day,
			}
		}
	}

	// fall back to default
	const t = abs.toDateTime(defaultTimeZone)
	return {
		year: t.year,
		month: t.month,
		day: t.day,
	}
}
