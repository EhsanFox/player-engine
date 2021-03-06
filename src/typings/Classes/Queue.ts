import Queue from "../../Classes/Queue";
import PlayerTrack from "../../Structers/PlayerTrack";

export interface QueueInterface {

    shuffle: () => boolean;
    skip: (num?: number) => boolean;
    previous: (num: number) => boolean;

    nextTracks: () => PlayerTrack[];
    previousTracks: () => PlayerTrack[];

    current: () => PlayerTrack;
    next: () => boolean;
    back: () => boolean;
    repeat: () => void;
    repeatOne: () => void;
    clear: () => void;

    addTracks: (x: PlayerTrack[]) => Queue;
    remove: (x: PlayerTrack | number, numbersToRemove?: number) => boolean;

    setMusicBitrates: (a: number) => void;
    setMusicVolumes: (a: number) => boolean;

    destroy: () => void;
    init: () => Promise<void>;
}