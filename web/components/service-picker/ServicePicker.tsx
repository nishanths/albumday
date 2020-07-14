import React from "react"
import { Service } from "shared/types"

type ServicePickerProps = {
	onPick: (s: Service) => void
}

export class ServicePicker extends React.Component<ServicePickerProps> {
	render() {
		return <div className="ServicePicker">
			<div onClick={() => this.props.onPick("spotify")}>
				Spotify
			</div>
			<div onClick={() => this.props.onPick("scrobble")}>
				Scrobble
			</div>
		</div>
	}
}
