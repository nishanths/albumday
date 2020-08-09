import React from "react"
import { Account, connectionComplete } from "shared"
import { Connect } from "../connect"
import { NProgressType } from "../../types"
import { RouteComponentProps } from "react-router"
import Toastify from "toastify-js"
import { defaultToastOptions, colors } from "../../shared"

export type FeedProps = {
	account: Account
	email: string
	onAccountChange: (a: Account) => void
	nProgress: NProgressType
	location: RouteComponentProps["location"]
}

export class Feed extends React.Component<FeedProps> {
	constructor(props: FeedProps) {
		super(props)
	}

	componentDidMount() {
		this.maybeShowConnectionNotification()
	}

	componentDidUpdate(prevProps: FeedProps) {
		console.log("receiving props", prevProps)
	}

	// Handle connection status messages that require redirects
	// (currently Spotify).
	private maybeShowConnectionNotification() {
		const p = new URLSearchParams(this.props.location.search)

		if (p.get("connect-error")) {
			Toastify({
				...defaultToastOptions,
				text: "Failed to connect with Spotify. Please try again.",
				backgroundColor: colors.brightRed,
			}).showToast()
		}

		if (p.get("connect-success")) {
			Toastify({
				...defaultToastOptions,
				text: "Successfully connected!",
			}).showToast()
		}
	}

	render() {
		if (!connectionComplete(this.props.account)) {
			return <div className="Feed">
				<Connect nProgress={this.props.nProgress} onConnectionChange={c => {
					this.props.onAccountChange({ ...this.props.account, connection: c })
				}} />
			</div>
		}

		return <div className="Feed">
			actual feed
		</div>
	}
}
