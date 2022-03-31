class ResetError extends Error {
    constructor() {
        super('ObservablePromise was reset while executing');
        this.name = 'ResetError';
    }
}
