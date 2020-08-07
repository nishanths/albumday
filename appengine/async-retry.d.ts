import { OperationOptions } from 'retry';

// NOTE(nishanth): copied from original, and modified to use "any" instead of "Error"

declare module "async-retry" {
	declare function AsyncRetry<A>(
	    fn: AsyncRetry.RetryFunction<A>,
	    opts?: AsyncRetry.Options
	): Promise<A>;

	declare namespace AsyncRetry {
	    interface Options extends OperationOptions {
	        onRetry?: (e: any, attempt: number) => any;
	    }

	    type RetryFunction<A> = (bail: (e: any) => void, attempt: number) => A|Promise<A>;
	}

	export = AsyncRetry;
}
