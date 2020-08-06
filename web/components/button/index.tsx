import React from "react"
import { scrobbleBaseURL } from "shared"

type State = {}

export type ButtonProps = React.RefAttributes<HTMLButtonElement> & {
}

export class Button extends React.Component<ButtonProps, State> {
	constructor(props: ButtonProps) {
		super(props)
		this.state = {
		}
	}

	render() {
		return <div className="Button">
			<button {...this.props}>{this.props.children}</button>
		</div>
	}
}
