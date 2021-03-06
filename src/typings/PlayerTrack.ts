import { AudioResource } from "@discordjs/voice";
import { DurationType } from "music-engines/dist/src/typings/base.d";

export interface PlayerTrackInterface {

    platform: string;
    url: string;
    title: string;
    duration: DurationType;
    picture: string;
    stream: any;
    audioResource: AudioResource;
    metadata: any;

    init: () => Promise<void>;
    createResource: (inlineVolume: boolean) => AudioResource;
    addMetadata: (data: any) => void;
}