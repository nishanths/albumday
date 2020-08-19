import { ToastOptions } from "toastify-js"
import { assertExhaustive } from "./shared"
import { Service } from "./api"

export const scrobbleBaseURL = "https://scrobbl.es"
export const scrobbleAPIBaseURL = "https://selective-scrobble.appspot.com/api/v1"

export const supportEmail = "littlerootorg@gmail.com"

export const colors = {
	green: "rgba(49, 199, 67, 1)",
	brightRed: "rgba(251, 83, 76, 1)",
	mediumRed: "rgba(188, 68, 64, 1)",
	darkRed: "rgba(140, 16, 16, 1)",
	yellow: "rgba(252, 188, 59, 1)",
}

export const defaultToastOptions: ToastOptions = {
	gravity: "top",
	position: "center",
	duration: 2100,
	backgroundColor: colors.green,
	className: "toastify-custom toastify-custom-higher-precedence toastify-custom-higher-precedence-2",
}

export function musicServiceDisplay(s: Service): string {
	switch (s) {
		case "spotify":
			return "Spotify"
		case "scrobble":
			return "Apple Music"
		default:
			assertExhaustive(s)
	}
}

export const connectSuccessMessage = "You're all set up to receive birthday email notifications!"
export const connectSuccessDuration = 4000
