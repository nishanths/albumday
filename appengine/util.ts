import { Request } from "express"

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

