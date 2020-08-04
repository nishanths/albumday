import React from "react"
import { Account } from "shared"

export type SettingsProps = {
	account: Account
	email: string
	onAccountChange: (a: Account) => void
	onLogout: () => void
}

export class Settings extends React.Component<SettingsProps> {
	constructor(props: SettingsProps) {
		super(props)
	}

	render() {
		return <>settings</>
	}
}
