import Player from "../../Classes/Player";
import PlayerTrack from "../../Structers/PlayerTrack";
import Queue from "../../Classes/Queue";
import { YouTube, Deezer, Spotify, SoundCloud } from "music-engines";
import { StageChannel, VoiceChannel } from "discord.js";
import { VoiceConnection } from "@discordjs/voice";

export type SupportedEngines = "YouTube" | "SoundCloud" | "Deezer" | "Spotify";
export type SupportedEngineClasses = YouTube | Deezer | Spotify | SoundCloud;
export type RepeatMode = "one" | "all" | "none";

export interface PlayerOptions {

    engine: SupportedEngines;
    leaveOnEnd: boolean;
    selfDeaf: boolean;
    selfMute: boolean;
}

export interface PlayerSearchOpts {
    engine?: SupportedEngines;
    single?: boolean;
    limit?: number;
}

export interface PlayerInterface {
    settings: PlayerOptions;
    tracks: Queue;
    engine: SupportedEngineClasses;
    repeat: RepeatMode;

    search: (query: string, options?: PlayerSearchOpts) => Promise<PlayerTrack | PlayerTrack[]>;
    connection: (channel?: VoiceChannel | StageChannel) => VoiceConnection | void;
    isChannelEmpty: (channel?: VoiceChannel | StageChannel) => boolean;

    stop: (unsubscribe: boolean, forceStop: boolean) => boolean;
    resume: () => boolean;
    pause: (interpolateSilence: boolean) => boolean;

    setEngine: (engine: SupportedEngines) => Player;
    setRepeatMode: (mode: RepeatMode) => boolean;
    setBitrate: (a: number | "auto") => void;
    setVolume: (a: number) => boolean;

    destroy: (dc: boolean) => void;
}
