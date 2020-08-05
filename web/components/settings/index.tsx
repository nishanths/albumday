import React from "react"
import { Account, Service, assertExhaustive, connectionComplete } from "shared"
import { colors } from "../../shared"

export type SettingsProps = {
	account: Account
	email: string
	onAccountChange: (a: Account) => void
	onLogout: () => void
}

function displayService(s: Service): string {
	switch (s) {
		case "spotify": return "Spotify"
		case "scrobble": return "Apple Music"
		default: assertExhaustive(s)
	}
}

export class Settings extends React.Component<SettingsProps> {
	constructor(props: SettingsProps) {
		super(props)
	}

	render() {
		return <div className="Settings">
			<ul>
				<li><strong>Account</strong>: Logged in as foo@gmail.com — <a href="">log out</a>, <a href=""> delete account.</a></li>
				<li><strong>Email notifications</strong>: Enabled. A daily email will be sent with album birthdays — <a href="">turn off.</a></li>
				<li><strong>Music service</strong>: Connected to Spotify — <a href="">disconnect.</a></li>
			</ul>
		</div>
	}
}
