import { createBrowserHistory } from "history/"

export const appHistory = createBrowserHistory({
})

export type HistoryType = typeof appHistory
