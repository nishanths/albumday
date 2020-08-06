import React from "react"
import { Service, scrobbleBaseURL, Connection } from "shared"
import { NProgressType } from "../../types"
import { CSSTransition, SwitchTransition } from "react-transition-group"
import { RouteComponentProps } from "react-router"
import { Scrobble } from "./scrobble"

type State = {
	pickedService: Service | null
	servicesDownTransition: boolean
}

export type ConnectProps = {
	nProgress: NProgressType
	onConnectionChange: (c: Connection) => void
}

export class Connect extends React.Component<ConnectProps, State> {
	private startDoneTimer: number | undefined

	constructor(props: ConnectProps) {
		super(props)
		this.state = {
			pickedService: null,
			servicesDownTransition: false,
		}
	}

	// Start and done the progress bar to simulate the effect of a change taking
	// place.
	private startDoneProgress() {
		this.props.nProgress.start()
		this.startDoneTimer = setTimeout(() => {
			this.props.nProgress.done()
		}, 100)
	}

	componentDidMount() {
		this.setState({ servicesDownTransition: true })
	}

	componentWillUnmount() {
		clearTimeout(this.startDoneTimer)
	}

	render() {
		return <div className="Connect">
			<div className="main-instruction">
				<div className="title">Set up your music service.</div>
				<div className="subtitle">To get album birthday email notifications, link your music service.</div>
			</div>

			<SwitchTransition mode="out-in">
				<CSSTransition
					addEndListener={(node, done) => { node.addEventListener("transitionend", done, false) }}
					key={"" + (this.state.pickedService === null)}
					classNames="services-next-step-transition"
				>
					<div className="container">
						{this.state.pickedService === null ?
							<CSSTransition
								in={this.state.servicesDownTransition}
								addEndListener={(node, done) => { node.addEventListener("transitionend", done, false) }}
								timeout={750}
								classNames="services-down-transition"
							>
								<div className="services">
									<div className="service-container spotify" onClick={() => {
										window.location.pathname = "/connect/spotify"
									}}>
										<div className="service-box"></div>
										<div className="service-label">Spotify</div>
									</div>

									<div className="or"></div>

									<div className="service-container scrobble" onClick={() => {
										this.setState({ pickedService: "scrobble" })
									}}>
										<div className="service-box"></div>
										<div className="service-label">Apple Music</div>
									</div>
								</div>
							</CSSTransition> :
							<div className="service-detail">
								{this.state.pickedService === "scrobble" &&
									<Scrobble
										onBack={() => { this.setState({ pickedService: null }) }}
										nProgress={this.props.nProgress}
										onConnectionChange={this.props.onConnectionChange}
									/>}
							</div>
						}
					</div>
				</CSSTransition>
			</SwitchTransition>

		</div>
	}
}

