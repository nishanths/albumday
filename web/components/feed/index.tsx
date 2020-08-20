import React from "react"
import { Account, connectionComplete, BirthdayResponse, BirthdayItem, Service } from "../../api"
import { Connect } from "../connect"
import { NProgressType } from "../../types"
import { RouteComponentProps } from "react-router"
import Toastify, { ToastHandle, ToastOptions } from "toastify-js"
import { defaultToastOptions, colors, musicServiceDisplay, connectSuccessMessage, connectSuccessDuration } from "../../util"
import { assertExhaustive, shortMonth } from "../../shared"
import { Temporal } from "proposal-temporal"
import { CSSTransition } from "react-transition-group"

function firstFetchDurationDisplay(s: Service): string {
	switch (s) {
		case "scrobble":
			return "a few seconds"
		case "spotify":
			return "about half a minute"
		default:
			assertExhaustive(s)
	}
}

export type FeedProps = {
	account: Account
	email: string
	birthdayData: BirthdayData | null
	onAccountChange: (a: Account) => void
	onBirthdayData: (d: BirthdayData) => void
	nProgress: NProgressType
	location: RouteComponentProps["location"]
	history: RouteComponentProps["history"]
}

export type BirthdayData = {
	todayItems: BirthdayItem[]
	tomorrowItems: BirthdayItem[]
	todayTime: Temporal.DateTime
	tomorrowTime: Temporal.DateTime
}

type FeedState = {
	birthdays: {
		status: "success"
		data: BirthdayData
	} | {
		status: "loading"
		long: boolean
	} | {
		status: "initial"
	} | {
		status: "error"
	}
}

export class Feed extends React.Component<FeedProps, FeedState> {
	private readonly abort = new AbortController()
	private toast: ToastHandle | null = null

	constructor(props: FeedProps) {
		super(props)
		this.state = {
			birthdays: this.props.birthdayData !== null ?
				{ status: "success", data: this.props.birthdayData } :
				{ status: "initial" },
		}
	}

	componentDidMount() {
		this.maybeShowConnectionNotification()

		if (this.shouldFetchBirthdays()) {
			this.fetchBirthdays()
		}
	}

	componentDidUpdate(prevProps: FeedProps) {
		if (this.props.account !== prevProps.account || this.props.email !== prevProps.email) {
			if (this.shouldFetchBirthdays()) {
				this.fetchBirthdays()
			}
		}
	}

	componentWillUnmount() {
		try { this.toast?.hideToast() } catch { } // gross!
	}

	private shouldFetchBirthdays(): boolean {
		return connectionComplete(this.props.account) && this.props.birthdayData === null
	}

	private async fetchBirthdays() {
		if (!connectionComplete(this.props.account)) {
			throw "connection must be complete"
		}

		const today = Temporal.now.absolute()
		const tomorrow = today.plus({ days: 1 })

		const params = new URLSearchParams()
		const tzName = Temporal.now.timeZone().name
		params.set("timeZone", tzName)
		params.append("timestamp", "" + today.getEpochSeconds())
		params.append("timestamp", "" + tomorrow.getEpochSeconds())
		// params.append("cache", "off") // for debug

		let longLoadingTimer: number | undefined

		try {
			this.requestStart()
			this.setState({ birthdays: { status: "loading", long: false } })
			longLoadingTimer = setTimeout(() => {
				this.setState({ birthdays: { status: "loading", long: true } })
			}, 2000)

			const rsp = await fetch("/api/v1/birthdays?" + params.toString(), {
				signal: this.abort.signal,
			})

			this.requestEnd()
			switch (rsp.status) {
				case 200:
					const result = await rsp.json() as BirthdayResponse
					const data: BirthdayData = {
						todayItems: result[today.getEpochSeconds()] || [],
						tomorrowItems: result[tomorrow.getEpochSeconds()] || [],
						todayTime: today.toDateTime(tzName),
						tomorrowTime: tomorrow.toDateTime(tzName),
					}
					this.props.onBirthdayData(data) // also propagate up
					this.setState({ birthdays: { status: "success", data } })
					break
				case 401:
					this.showNewToast({
						...defaultToastOptions,
						text: "Cookie appears to be b0rked. Please reload the page.",
						backgroundColor: colors.brightRed,
						duration: -1,
						onClick: () => {
							window.location.assign("/start")
						},
					})
					this.setState({ birthdays: { status: "error" } })
					break
				case 412:
					this.showNewToast({
						...defaultToastOptions,
						text: `${musicServiceDisplay(this.props.account.connection!.service)} appears to be configured incorrectly. Please set it up again.`,
						backgroundColor: colors.yellow,
						duration: -1,
						onClick: () => {
							this.props.history.push("/settings")
						},
					})
					this.setState({ birthdays: { status: "error" } })
					break
				case 422:
					this.showNewToast({
						...defaultToastOptions,
						text: `${musicServiceDisplay(this.props.account.connection!.service)} connection failed. Please set it up again.`,
						backgroundColor: colors.yellow,
						duration: -1,
						onClick: () => {
							this.props.history.push("/settings")
						},
					})
					this.setState({ birthdays: { status: "error" } })
					break
				default:
					this.showNewToast({
						...defaultToastOptions,
						text: `Failed to connect with ${musicServiceDisplay(this.props.account.connection!.service)}. Please try again.`,
						backgroundColor: colors.brightRed,
						duration: -1,
					})
					this.setState({ birthdays: { status: "error" } })
					break
			}
		} catch (e) {
			console.error(e)
			this.setState({ birthdays: { status: "error" } })
			this.requestEnd()
			this.showNewToast({
				...defaultToastOptions,
				text: `Failed to connect with ${musicServiceDisplay(this.props.account.connection!.service)}. Please try again.`,
				backgroundColor: colors.brightRed,
				duration: -1,
			})
		} finally {
			clearTimeout(longLoadingTimer)
		}
	}

	private showNewToast(o: ToastOptions) {
		this.toast?.hideToast()
		this.toast = Toastify(o)
		this.toast.showToast()
	}

	private requestStart() {
		this.props.nProgress.start()
	}

	private requestEnd() {
		this.props.nProgress.done()
	}

	// Handle connection status messages that require redirects
	// (currently Spotify).
	private maybeShowConnectionNotification() {
		const p = new URLSearchParams(this.props.location.search)

		if (p.get("connect-error")) {
			Toastify({
				...defaultToastOptions,
				text: `Failed to connect with ${musicServiceDisplay(p.get("service") as Service)}. Please try again.`,
				backgroundColor: colors.brightRed,
			}).showToast()
		}

		if (p.get("connect-success")) {
			Toastify({
				...defaultToastOptions,
				text: connectSuccessMessage,
				duration: connectSuccessDuration,
			}).showToast()
		}
	}

	private noItems(items: BirthdayItem[]) {
		return items.length === 0
	}

	render() {
		if (!connectionComplete(this.props.account)) {
			return <div className="Feed">
				<Connect nProgress={this.props.nProgress} onConnectionChange={c => {
					this.props.onAccountChange({ ...this.props.account, connection: c })
				}} />
			</div>
		}

		if (this.state.birthdays.status === "initial") {
			return <div className="Feed">
			</div>
		}

		if (this.state.birthdays.status === "loading") {
			const longText = <CSSTransition in={this.state.birthdays.long} timeout={750} classNames="long-text-transition">
				<div className="long-text">It takes {firstFetchDurationDisplay(this.props.account.connection!.service)} the first time.</div>
			</CSSTransition>

			return <div className="Feed">
				<div className="loading-container">
					<div className="text-container">
						{this.state.birthdays.long && <div className="main-text">Finding album birthdays</div>}
						{longText}
					</div>
					{this.state.birthdays.long && loader}
				</div>
			</div>
		}

		if (this.state.birthdays.status === "error") {
			return <div className="Feed">
			</div>
		}

		const { data } = this.state.birthdays

		return <div className="Feed">
			<div className="day-container">
				<div className="today date-head">
					<span>Today,&nbsp;</span>
					<span className="secondary">{data.todayTime.day} {shortMonth(data.todayTime)}</span>
				</div>
				{this.noItems(data.todayItems) && <div className="no-items">No birthdays in your library today.</div>}
				{data.todayItems.map(item => {
					return <div key={item.link} className="item"><BirthdayItemComponent {...item} /></div>
				})}
			</div>

			<div className="day-container">
				<div className="tomorrow date-head">
					<span>Tomorrow,&nbsp;</span>
					<span className="secondary">{data.tomorrowTime.day} {shortMonth(data.tomorrowTime)}</span>
				</div>
				{this.noItems(data.tomorrowItems) && <div className="no-items">No birthdays in your library tomorrow.</div>}
				{data.tomorrowItems.map(item => {
					return <div key={item.link} className="item"><BirthdayItemComponent {...item} /></div>
				})}
			</div>
		</div>
	}
}

// https://github.com/SamHerbert/SVG-Loaders
const loader = <div className="loader">
	{/* <!-- By Sam Herbert (@sherb), for everyone. More @ http://goo.gl/7AJzbL --> */}
	<svg width="140" height="64" viewBox="0 0 140 64" xmlns="http://www.w3.org/2000/svg" fill="#d6156d">
		<path d="M30.262 57.02L7.195 40.723c-5.84-3.976-7.56-12.06-3.842-18.063 3.715-6 11.467-7.65 17.306-3.68l4.52 3.76 2.6-5.274c3.717-6.002 11.47-7.65 17.305-3.68 5.84 3.97 7.56 12.054 3.842 18.062L34.49 56.118c-.897 1.512-2.793 1.915-4.228.9z" fillOpacity=".5">
			<animate attributeName="fill-opacity"
				begin="0s" dur="1.4s"
				values="0.5;1;0.5"
				calcMode="linear"
				repeatCount="indefinite" />
		</path>
		<path d="M105.512 56.12l-14.44-24.272c-3.716-6.008-1.996-14.093 3.843-18.062 5.835-3.97 13.588-2.322 17.306 3.68l2.6 5.274 4.52-3.76c5.84-3.97 13.592-2.32 17.307 3.68 3.718 6.003 1.998 14.088-3.842 18.064L109.74 57.02c-1.434 1.014-3.33.61-4.228-.9z" fillOpacity=".5">
			<animate attributeName="fill-opacity"
				begin="0.7s" dur="1.4s"
				values="0.5;1;0.5"
				calcMode="linear"
				repeatCount="indefinite" />
		</path>
		<path d="M67.408 57.834l-23.01-24.98c-5.864-6.15-5.864-16.108 0-22.248 5.86-6.14 15.37-6.14 21.234 0L70 16.168l4.368-5.562c5.863-6.14 15.375-6.14 21.235 0 5.863 6.14 5.863 16.098 0 22.247l-23.007 24.98c-1.43 1.556-3.757 1.556-5.188 0z" />
	</svg>
</div>


export class BirthdayItemComponent extends React.Component<BirthdayItem> {
	private songList(item: BirthdayItem) {
		const songs = item.songs.slice(0, 5)
		return songs.map((s, i) => {
			const punct = i === songs.length - 1 ? "" : <>,&nbsp;</>
			const song = <span className="song">{s.title}</span>
			return s.link ?
				<span key={s.link}><a href={s.link} target="_blank">{song}</a>{punct}</span> :
				<span key={s.link}>{song}{punct}</span>
		})
	}

	render() {
		const item = this.props
		const art = <div className="art" style={{ backgroundImage: "url(" + item.artworkURL + ")" }}></div>
		const album = <span className="album">{item.album}</span>

		return <div className="BirthdayItem">
			{item.link ? <a href={item.link} target="_blank" className="pointer">{art}</a> : art}
			<div className="info">
				<div className="r0">
					{item.link ? <a href={item.link} target="_blank" className="pointer">{album}</a> : album}
				</div>
				<div className="r1">
					<span className="artist">{item.artist}</span>
					<span className="year">, {item.release.year}</span>
					{item.releaseMatch == "month" && <span className="release-match">&nbsp;— this month</span>}
				</div>
				<div className="r2">
					<span className="songs"><span className="emph">Songs: {this.songList(item)}</span></span>
				</div>
			</div>

		</div>
	}
}
