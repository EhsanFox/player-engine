import { PlayerTrackInterface } from "../typings/PlayerTrack";
import PlayerError from "../utils/PlayerError";
import { typings as EngineTypings, wrappers } from "music-engines";
import { opus, FFmpeg } from "prism-media"
import { Errors } from "../utils/Enums";
import * as stream from 'node:stream';
import { IncomingMessage } from "http";
import { AudioResource, createAudioResource, StreamType } from "@discordjs/voice";
import { DurationType } from "music-engines/dist/src/typings/base.d";

const { youtube, soundcloud, spotify, deezer } = wrappers;
const { YouTubeTrack } = youtube;
const { SoundCloudTrack } = soundcloud;
const { SpotifyTrack } = spotify;
const { DeezerTrack } = deezer;

export default class PlayerTrack implements PlayerTrackInterface {

    readonly title: string;
    readonly url: string;
    readonly picture: string;
    readonly platform: string;
    readonly duration: DurationType;
    public stream: opus.Encoder | FFmpeg | stream.Readable | IncomingMessage | Buffer;
    public raw: any;
    public audioResource: AudioResource;
    public metadata: any = {};

    private tempStream: any;
    private streamType: StreamType;
    
    constructor(data: any)
    {
        this.raw = data;

        if(data instanceof YouTubeTrack)
        {
            this.title = data.title;
            this.url = data.url;
            this.picture = data.picture;
            this.platform = data.platform;
            this.stream = data.stream();
            this.duration = data.duration;

            this.streamType = StreamType.Opus;
        }
        else if(data instanceof SoundCloudTrack)
        {
            this.title = data.title;
            this.url = data.url;
            this.picture = data.picture;
            this.platform = data.platform;
            this.tempStream = data.stream();
            this.duration = data.duration;
        }
        else if(data instanceof SpotifyTrack)
        {
            this.title = data.title;
            this.url = data.url;
            this.picture = data.picture;
            this.platform = data.platform;
            this.tempStream = data.stream();
            this.duration = data.duration;
        }
        else if(data instanceof DeezerTrack)
        {
            this.title = data.title;
            this.url = data.url;
            this.picture = data.picture;
            this.platform = data.platform;
            this.tempStream = data.stream();
            this.duration = data.duration;
        }
        else
            throw new PlayerError(Errors.NOT_SUPPORTED, `Recived Track data is not by supported Engines`);
    }

    async init(): Promise<void> 
    {
        try {
            if(this.tempStream instanceof Promise)
                this.tempStream = await this.tempStream;

            if( this.tempStream instanceof opus.Encoder ||
                this.tempStream instanceof FFmpeg ||
                this.tempStream instanceof IncomingMessage ||
                this.tempStream instanceof stream.Readable ||
                this.tempStream instanceof Buffer)
            {
                this.stream = this.tempStream;
                this.createResource();
            }
        } catch (error) {
            throw error;
        }
    }

    createResource(inlineVolume: boolean = true): AudioResource
    {
        if(!this.audioResource)
        {
            this.audioResource = createAudioResource(this.stream as stream.Readable, {
                metadata: {
                    title: this.title,
                    picture: this.picture,
                    url: this.url,
                    platform: this.platform,
                    duraation: this.duration.full,
                },
                //inputType: this.streamType ?? StreamType.Raw,
                inlineVolume,
            });
        }

        return this.audioResource;
    }

    addMetadata(data: any): void 
    {
        this.metadata = {
            ...data,
            ...this.metadata
        };
    }
}