import { Interaction, CommandInteraction, Guild, StageChannel, VoiceChannel } from "discord.js";
import { getVoiceConnection, joinVoiceChannel, VoiceConnection, AudioPlayer, createAudioPlayer, createAudioResource, AudioResource, NoSubscriberBehavior, AudioPlayerStatus, PlayerSubscription, VoiceConnectionStatus, entersState } from "@discordjs/voice"
import { PlayerInterface, PlayerOptions, PlayerSearchOpts, RepeatMode, SupportedEngineClasses, SupportedEngines } from "../typings/Classes/Player";
import Queue from "./Queue";
import * as Engines from "music-engines";
import PlayerError from "../utils/PlayerError";
import { Errors, PlayerEvents, QueueEvents } from "../utils/Enums";
import PlayerTrack from "../Structers/PlayerTrack";
import { EventEmitter } from "events";

const { SoundCloud, Spotify, YouTube, Deezer, wrappers } = Engines;
const { youtube, soundcloud, spotify, deezer } = wrappers;
const { YouTubeTrack } = youtube;
const { SoundCloudTrack } = soundcloud;
const { SpotifyTrack } = spotify;
const { DeezerTrack } = deezer;

export default class Player extends EventEmitter implements PlayerInterface {

    public settings: PlayerOptions;
    readonly tracks: Queue;
    public engine: SupportedEngineClasses = new YouTube();
    public repeat: RepeatMode = "none";

    private guild: Guild;
    private vcConnection: VoiceConnection;
    private channel: VoiceChannel | StageChannel;
    private audioPlayer: AudioPlayer;
    private vcSubscription: PlayerSubscription | boolean;
    private isPlaying: boolean;
    private isConnected: boolean;
    private isDestroyed: boolean;

    constructor(guild: Guild, opts: PlayerOptions)
    {
        super({
            captureRejections: true
        });

        this.guild = guild;
        this.settings = opts;
        this.setEngine(this.settings.engine);
        this.tracks = new Queue();
    }

    private watchDestroyed(emit: boolean = true): boolean
    {
        if(this.isDestroyed && emit)
            this.emit(PlayerEvents.ERROR, new PlayerError(Errors.NOT_EXIST, `This Player is destroyed and doesn't exist.`));
        
        return this.isDestroyed;
    }
    
    destroy(dc: boolean = true): void
    {
        if(this.watchDestroyed()) return;
        if(this.vcSubscription instanceof PlayerSubscription)
            this.vcSubscription.unsubscribe();
        this.vcSubscription = null;
        if(dc)
            this.vcConnection.disconnect();
        this.vcConnection.destroy();
        
    }

    setEngine(engine: SupportedEngines): Player {
        if(this.watchDestroyed()) return;
        if(!(engine in Engines))
            throw new PlayerError(Errors.NOT_SUPPORTED, `${engine} is not supported by Music-Engines package.`);

        this.settings.engine = engine;
        this.engine = new Engines[engine];
        return this;
    }

    setBitrate(a: number | "auto"): void
    {
        if(this.watchDestroyed()) return;
        if(a === "auto") a = this.channel.bitrate ?? 64000;

        this.tracks.setMusicBitrates(a);
    }

    setVolume(a: number): boolean
    {
        if(this.watchDestroyed()) return;
        if(a > Infinity || a < 0 || isNaN(a)) return false;

        this.tracks.setMusicBitrates(a);
        return true;
    }

    setRepeatMode(mode: RepeatMode): boolean
    {
        if(this.watchDestroyed()) return;
        const modes = ["one", "all", "none"];
        if(!modes.includes(mode))
            return false;

        this.repeat = mode;
        return true;
    }

    isChannelEmpty(channel?: VoiceChannel | StageChannel): boolean
    {
        if(this.watchDestroyed()) return;
        if(!this.channel && !channel)
            throw new PlayerError(Errors.NOT_EXIST, 'There is no VoiceConnection for a channel established Yet.');

        if(!channel)
            channel = this.channel;

        return channel.members.filter(x => !x.user.bot).size === 0;
    }

    async search(query: string, options: PlayerSearchOpts = { engine: this.settings.engine, single: true }): Promise<PlayerTrack | PlayerTrack[]>
    {
        if(this.watchDestroyed()) return;
        const engine: SupportedEngineClasses = (options.engine && options.engine in Engines) ? new Engines[options.engine] : this.engine;
        const searchRes = await engine.use(query)
        if(Array.isArray(searchRes))
        {
            if(options.single)
                if(searchRes[0] instanceof YouTubeTrack || searchRes[0] instanceof SpotifyTrack || searchRes[0] instanceof SoundCloudTrack || searchRes[0] instanceof DeezerTrack)
                    return new PlayerTrack(searchRes[0]);
            else if(options.limit)
                searchRes.length = options.limit;

            return searchRes.map(x => new PlayerTrack(x));
        }
        else
            return new PlayerTrack(searchRes);
    }

    connection(channel?: VoiceChannel | StageChannel): VoiceConnection | void
    {
        if(this.watchDestroyed()) return;
        if(this.vcConnection)
            return this.vcConnection;
        else if(getVoiceConnection(this.guild.id))
        {
            this.vcConnection = getVoiceConnection(this.guild.id);
            this.isConnected = true;
            return this.vcConnection;
        }
        else
            if(channel instanceof VoiceChannel || channel instanceof StageChannel)
            {
                this.vcConnection = joinVoiceChannel({
                    adapterCreator: channel.guild.voiceAdapterCreator,
                    guildId: this.guild.id,
                    channelId: channel.id,
                    selfDeaf: ('selfDeaf' in this.settings) ? this.settings.selfDeaf : true,
                    selfMute: ('selfMute' in this.settings) ? this.settings.selfMute : false
                });
                this.isConnected = true;
                
                // Handle Voice Connection Events
                this.vcConnection.on("error", (e) => { this.emit(PlayerEvents.ERROR, e) });
                this.vcConnection.on(VoiceConnectionStatus.Ready, (o, n) => { 
                    this.emit(PlayerEvents.CONNECT, o, n);
                    this.isConnected = true;
                });

                // Handle Server Reconnects
                this.vcConnection.on(VoiceConnectionStatus.Disconnected, async (o, n) => {
                    try {
                        await Promise.race([
                            entersState(this.vcConnection, VoiceConnectionStatus.Signalling, 5_000),
                            entersState(this.vcConnection, VoiceConnectionStatus.Connecting, 5_000),
                        ]);
                    } catch (error) {
                        this.emit(PlayerEvents.DISCONNECT, error);
                    }
                })
                
                return this.vcConnection;
            }
            else if(channel)
                throw new PlayerError(Errors.INVALID_INPUT, `Channel is not a VoiceChannel or StageChannel.`);
            else
                throw new PlayerError(Errors.NOT_EXIST, `There is no VoiceConnection established neither recived a valid input in the method.`)
    }

    pause(interpolateSilence: boolean = true): boolean
    {
        if(this.watchDestroyed()) return;
        if(!this.vcConnection || !this.audioPlayer)
            throw new PlayerError(Errors.NOT_EXIST, 'There is no Voice Connection or Audio Player established Yet.');

        return this.audioPlayer.pause(interpolateSilence);
    }

    resume(): boolean
    {
        if(this.watchDestroyed()) return;
        if(!this.vcConnection || !this.audioPlayer)
            throw new PlayerError(Errors.NOT_EXIST, 'There is no Voice Connection or Audio Player established Yet.');

        return this.audioPlayer.unpause()
    }

    stop(unsubscribe: boolean = false, forceStop: boolean = true): boolean
    {
        if(this.watchDestroyed()) return;
        if(!this.vcConnection || !this.audioPlayer || !this.vcSubscription)
            throw new PlayerError(Errors.NOT_EXIST, 'There is no VoiceConnection, AudioPlayer or VoiceSubscription established Yet.');

        if(unsubscribe && this.vcSubscription)
        {
            if(this.vcSubscription instanceof PlayerSubscription)
                this.vcSubscription.unsubscribe();
            this.vcSubscription = null;
        }

        return this.audioPlayer.stop(forceStop);
    }

    async play(interaction: Interaction | CommandInteraction, tracks: PlayerTrack[])
    {
        if(this.watchDestroyed()) return;
        if(!this.vcConnection || !this.isConnected)
            throw new PlayerError(Errors.NOT_EXIST, 'There is no Voice Connection established Yet.');

        if(!this.audioPlayer)
            this.audioPlayer = createAudioPlayer({
                behaviors: {
                    noSubscriber: (this.settings.leaveOnEnd) ? NoSubscriberBehavior.Stop : NoSubscriberBehavior.Pause
                }
            })
        
        if(this.tracks.initialized)
            await tracks.map(async x => await x.init())

        this.tracks.addTracks(tracks);

        if(!this.tracks.initialized)
            await this.tracks.init();

        if(!this.isPlaying)
        {
            this.audioPlayer.play(this.tracks.current().createResource());

            if(!this.vcSubscription)
                this.vcSubscription = this.vcConnection.subscribe(this.audioPlayer);

            this.emit(PlayerEvents.TRACK, this.tracks.current());
            this.isPlaying = true;
        }

        // Handle Next Tracks
        this.audioPlayer.on(AudioPlayerStatus.Idle, (o, n) => {

            // Handle Repeat Mode
            if(this.repeat == "all")
                this.tracks.repeat();
            else if(this.repeat == "one")
                this.tracks.repeatOne();

            if(!this.tracks.nextTracks().length)
            {
                this.emit(PlayerEvents.END, this.tracks.current());
                if(this.settings.leaveOnEnd)
                {
                    if(this.vcSubscription instanceof PlayerSubscription)
                        this.vcSubscription.unsubscribe();
                    this.vcConnection.disconnect();
                    this.vcConnection.destroy();
                }
            }
            else
            {
                this.tracks.next();
                this.audioPlayer.play(this.tracks.current().createResource());
                this.emit(PlayerEvents.TRACK, this.tracks.current());
            }
        })

        this.audioPlayer.on("error", (e) => {
            this.emit(PlayerEvents.ERROR, e);
        });
    }
}