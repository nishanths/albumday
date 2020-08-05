import React from "react"
import { scrobbleBaseURL } from "shared"

type State = {}

export type ButtonProps = {
	buttonProps?: Partial<React.ButtonHTMLAttributes<HTMLButtonElement>>
}

export class Button extends React.Component<ButtonProps, State> {
	constructor(props: ButtonProps) {
		super(props)
		this.state = {
		}
	}

	render() {
		return <div className="Button">
			<button {...this.props.buttonProps}>{this.props.children}</button>
		</div>
	}
}
