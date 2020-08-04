import React from "react"
import { Service, scrobbleBaseURL } from "shared"

export type State = {
	pickedService: Service | null
}

export class Connect extends React.Component<{}, State> {
	constructor(props: {}) {
		super(props)
		this.state = {
			pickedService: null,
		}
	}

	render() {
		return <div className="Connect">
			<div className="main-instruction">Link your music service.</div>
			<div className="container">
				{this.state.pickedService === null && <div className="services">
					<div className="service-container spotify">
						<div className="service-box"></div>
						<div className="service-label">Spotify</div>
					</div>
					<div className="or"></div>
					<div className="service-container scrobble">
						<div className="service-box"></div>
						<div className="service-label">Apple Music</div>
					</div>
				</div>}
			</div>
		</div>
	}
}

// <a href={scrobbleBaseURL} target="_blank">scrobble</a>
