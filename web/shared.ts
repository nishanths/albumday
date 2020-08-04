import { Options as ToastOptions } from "toastify-js"

export const colors = {
	green: "rgba(49, 199, 67, 1)",
	brightRed: "rgba(251, 83, 76, 1)",
}

export const defaultToastOptions: Partial<ToastOptions> = {
	position: "center",
	duration: 3000,
	backgroundColor: colors.green,
	stopOnFocus: true,
}
