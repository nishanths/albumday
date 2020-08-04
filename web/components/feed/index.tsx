import React from "react"
import { Account } from "shared"

export type FeedProps = {
	account: Account
	email: string
	onAccountChange: (a: Account) => void
}

export class Feed extends React.Component<FeedProps> {
	constructor(props: FeedProps) {
		super(props)
	}

	render() {
		return <>feed</>
	}
}
