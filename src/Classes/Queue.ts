import { Collection, GuildResolvable } from "discord.js";
import { QueueInterface } from "../typings/Classes/Queue";
import PlayerTrack from "../Structers/PlayerTrack";
import { EventEmitter } from "events"
import { Errors, QueueEvents } from "../utils/Enums";
import PlayerError from "../utils/PlayerError";

export default class Queue extends EventEmitter implements QueueInterface {

    public initialized: boolean = false;
    private tracks: PlayerTrack[] = [];
    private currentTrack: PlayerTrack;
    private endedTracks: PlayerTrack[] = [];
    private isDestoryed: boolean = false;

    constructor(tracks?: PlayerTrack[])
    {
        super({
            captureRejections: true
        });
        this.tracks = tracks;
    }

    private watchDestroyed(emit: boolean = true): boolean {
        if(this.isDestoryed && emit)
            this.emit(QueueEvents.ERROR, new PlayerError(Errors.NOT_EXIST, `This Queue is destroyed and doesn't exist.`));

        return this.isDestoryed;
    }

    destroy(): void
    {
        if(this.watchDestroyed()) return;
        
        this.tracks = []
        this.endedTracks = [];
        this.currentTrack = null;
        this.isDestoryed = true;
    }
    
    async init(): Promise<void>
    {
        if(this.watchDestroyed()) return;
        try
        {
            for(const track of this.tracks)
                await track.init();

            for(const track of this.endedTracks)
                await track.init();

            this.currentTrack = this.tracks[0];
            this.initialized = true;
        }
        catch(e)
        {
            throw e;
        }
    }

    setMusicBitrates(a: number): void
    {
        if(this.watchDestroyed()) return;

        this.tracks.map(x => x.audioResource?.encoder?.setBitrate(a));
        this.endedTracks.map(x => x.audioResource?.encoder?.setBitrate(a));
        this.currentTrack = this.tracks[0];
    }

    setMusicVolumes(a: number): boolean
    {
        if(this.watchDestroyed()) return;

        this.tracks.map(x => x.audioResource?.volume?.setVolumeLogarithmic(a / 100));
        this.endedTracks.map(x => x.audioResource?.volume?.setVolumeLogarithmic(a / 100));
        this.currentTrack = this.tracks[0];
    }

    clear(): void
    {
        if(this.watchDestroyed()) return;
        this.tracks = []
        this.endedTracks = [];
        this.currentTrack = null;
        this.emit(QueueEvents.CLEAN);
    }

    repeat(): void
    {
        if(this.watchDestroyed()) return;
        this.endedTracks.unshift(this.currentTrack);
        this.tracks.concat(this.endedTracks);
        this.endedTracks = [];
        this.currentTrack = this.tracks[0];
    }

    repeatOne(): void
    {
        if(this.watchDestroyed()) return;
        this.tracks.unshift(this.currentTrack);
    }

    nextTracks(): PlayerTrack[] {
        if(this.watchDestroyed()) return;
        if(this.tracks.length)
        {
            const currentTrack = this.tracks.shift();
            const result = this.tracks;
            this.tracks.unshift(currentTrack);

            return result;
        }
        else
            return [];
    }

    previousTracks(): PlayerTrack[] {
        if(this.watchDestroyed()) return;
        
        return this.endedTracks;
    }

    shuffle(): boolean {
        if(this.watchDestroyed()) return;

        if (!this.tracks.length || this.tracks.length < 3) return false;
        const currentTrack = this.tracks.shift();

        for (let i = this.tracks.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.tracks[i], this.tracks[j]] = [this.tracks[j], this.tracks[i]];
        }

        this.tracks.unshift(currentTrack);

        return true;
    }

    current(): PlayerTrack
    {
        if(this.watchDestroyed()) return;

        if(!this.currentTrack)
            this.currentTrack = this.tracks[0];

        return this.currentTrack;
    }

    next(): boolean
    {
        if(this.watchDestroyed()) return;

        if(this.tracks.length <= 1)
            return false

        this.endedTracks.unshift(this.tracks.shift());
        this.currentTrack = this.tracks[0];
        return true;
    }

    back(): boolean
    {
        if(this.watchDestroyed()) return;

        if(!this.endedTracks.length)
            return false;

        this.tracks.unshift(this.endedTracks.shift());
        this.currentTrack = this.tracks[0];
        return true;
    }

    skip(num: number = 1): boolean
    {
        if(this.watchDestroyed()) return;

        num = num - 1;
        if(num > this.tracks.length)
            return false;

        this.endedTracks.concat(this.tracks.splice(0, num));
        this.currentTrack = this.tracks[0];
        this.emit(QueueEvents.CHANGE, { action: "skip", counts: num });
        return true;
    }

    previous(num: number = 1)
    {
        if(this.watchDestroyed()) return;

        num = num - 1;
        if(num > this.endedTracks.length)
            return false;

        this.endedTracks.splice(0, num).concat(this.tracks);
        this.currentTrack = this.tracks[0];
        this.emit(QueueEvents.CHANGE, { action: "previous", counts: num });
        return true;
    }

    addTracks(x: PlayerTrack[]): Queue
    {
        if(this.watchDestroyed()) return;

        this.tracks.concat(x);
        return this;
    }

    remove(x: number | PlayerTrack, numbersToRemove?: number): boolean
    {
        if(this.watchDestroyed()) return;
        if(x instanceof PlayerTrack)
        {
            const trackFound = this.tracks.find(s => s == x);
            if(!trackFound)
                return false;
            else
            {
                numbersToRemove = 1;
                const trackIndex = this.tracks.findIndex(s => s == x);
                const removed = this.tracks.splice(trackIndex, numbersToRemove);
                this.emit(QueueEvents.CHANGE, { action: "remove", counts: numbersToRemove, objects: removed });
                return true;
            }
        }
        else
        {
            if(!numbersToRemove)
                numbersToRemove = 1;

            const removed = this.tracks.splice(x, numbersToRemove);
            this.emit(QueueEvents.CHANGE, { action: "remove", counts: numbersToRemove, objects: removed });
            return true;
        }
    }
}