/** An error whose `headline` and message are meant for the user, as they are; `ErrorDisplay` shows them. */
export class UserFacingError extends Error {
    constructor(
        public readonly headline: string,
        message: string,
    ) {
        super(message);
        this.name = 'UserFacingError';
    }
}
