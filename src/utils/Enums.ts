export enum Errors {
    EXIST = 409,
    NOT_SUPPORTED = 415,
    INVALID_INPUT = 400,
    NOT_EXIST = 404,
    
}

export enum QueueEvents {
    CLEAN = "clear",
    CHANGE = "change",
    ERROR = "error",
    
}

export enum PlayerEvents {

    CONNECT = "connect",
    DISCONNECT = "disconnect",
    END = "finish",
    ERROR = "error",
    TRACK = "track",
    

}