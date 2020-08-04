import React from "react"
import { Service, scrobbleBaseURL } from "shared"
import { NProgressType } from "../../types"
import { CSSTransition, SwitchTransition } from "react-transition-group"

type State = {
	pickedService: Service | null
	servicesTransition: boolean
}

export type ConnectProps = {
	nProgress: NProgressType
}

export class Connect extends React.Component<ConnectProps, State> {
	private startDoneTimer: number | undefined

	constructor(props: ConnectProps) {
		super(props)
		this.state = {
			pickedService: null,
			servicesTransition: false,
		}
	}

	// Start and stop the progress bar to simulate the effect of a change taking
	// place.
	private startDoneProgress() {
		this.props.nProgress.start()
		this.startDoneTimer = setTimeout(() => {
			this.props.nProgress.done()
		}, 100)
	}

	componentDidMount() {
		this.setState({ servicesTransition: true })
	}

	componentWillUnmount() {
		clearTimeout(this.startDoneTimer)
	}

	render() {
		return <div className="Connect">
			<div className="main-instruction">
				<div className="title">Link your music.</div>
				<div className="subtitle">To receive email notifications and see your feed, set up your music service.</div>
			</div>

			<SwitchTransition mode="out-in">
				<CSSTransition
					addEndListener={(node, done) => { node.addEventListener("transitionend", done, false) }}
					key={"" + (this.state.pickedService === null)}
					classNames="fade"
				>
					<div className="container">
						{this.state.pickedService === null ?
							<CSSTransition
								in={this.state.servicesTransition}
								addEndListener={(node, done) => { node.addEventListener("transitionend", done, false) }}
								timeout={750}
								classNames="services-transition"
							>
								<div className="services">
									<div className="service-container spotify" onClick={() => {
										this.setState({ pickedService: "spotify" })
										this.startDoneProgress()
									}}>
										<div className="service-box"></div>
										<div className="service-label">Spotify</div>
									</div>

									<div className="or"></div>

									<div className="service-container scrobble" onClick={() => {
										this.setState({ pickedService: "scrobble" })
										this.startDoneProgress()
									}}>
										<div className="service-box"></div>
										<div className="service-label">Apple Music</div>
									</div>
								</div>
							</CSSTransition> :
							<div className="service-detail">
								{this.state.pickedService}
							</div>
						}
					</div>
				</CSSTransition>
			</SwitchTransition>

		</div>
	}
}

