import { Request } from "express"
import { CacheParam } from "shared"

export function rawQuery(req: Request): string {
	const startIdx = req.originalUrl.indexOf("?")
	if (startIdx === -1) {
		return ""
	}
	const endIdx = req.originalUrl.indexOf("#")
	if (endIdx === -1) {
		return req.originalUrl.substring(startIdx)
	}
	return req.originalUrl.substring(startIdx, endIdx)
}

export function isCacheParam(s: string): s is CacheParam {
	return s === "on" || s === "off"
}
