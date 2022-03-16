import { Errors } from "./Enums";

export default class PlayerError extends Error {

    public createdAt: Date = new Date();
    readonly code: Errors;
    readonly message: string;
    readonly createdTimestamp: number;
    
    constructor(code: Errors, message: string)
    {
        super();

        this.code = code;
        this.message = `[${code}]: ${message}`;
        this.createdTimestamp = this.createdAt.getTime();
    }

    toJSON()
    {
        return { stack: this.stack, code: this.code, created: this.createdTimestamp };
    }

    toString()
    {
        return `${this.message}\n${this.stack}`;
    }
}