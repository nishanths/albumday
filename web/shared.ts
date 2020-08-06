import { Options as ToastOptions } from "toastify-js"

export const colors = {
	green: "rgba(49, 199, 67, 1)",
	brightRed: "rgba(251, 83, 76, 1)",
	mediumRed: "rgba(188, 68, 64, 1)",
	darkRed: "rgba(140, 16, 16, 1)",
	yellow: "rgba(252, 188, 59, 1)",
}

export const defaultToastOptions: Partial<ToastOptions> = {
	gravity: "top",
	position: "center",
	duration: 3000,
	backgroundColor: colors.green,
	stopOnFocus: true,
	className: "toastify-toast",
}
