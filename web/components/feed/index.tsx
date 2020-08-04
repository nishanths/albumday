import React from "react"
import { Account, connectionComplete } from "shared"
import Toastify from "toastify-js"
import { Connect } from "../connect"

export type FeedProps = {
	account: Account
	email: string
	onAccountChange: (a: Account) => void
}

export class Feed extends React.Component<FeedProps> {
	constructor(props: FeedProps) {
		super(props)
	}

	componentDidMount() {

	}

	render() {
		if (connectionComplete(this.props.account)) {
			return <></>
		}

		return <div className="Feed">
			<Connect />
		</div>
	}
}
