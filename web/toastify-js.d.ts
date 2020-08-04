module "toastify-js" {
	type Options = {
		text: string
		node: Node
		duration: number
		selector: string
		close: boolean
		gravity: "top" | "bottom"
		position: "left" | "right" | "center"
		backgroundColor: string
		className: string
		stopOnFocus: boolean
		callback: () => void
		onClick: () => void
		offset: {
			x?: number | string
			y?: number | string
		}
	}

	type ToastHandle = {
		showToast: () => void
		hideToast: () => void
	}

	export default function (options?: Partial<Options>): ToastHandle
}
