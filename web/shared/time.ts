import { Temporal } from "proposal-temporal"

const shortMonthNames = [
	"Jan", "Feb", "Mar", "Apr", "May", "Jun",
	"Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
]

export function shortMonth(d: Temporal.DateTime) {
	return shortMonthNames[d.month-1]
}
