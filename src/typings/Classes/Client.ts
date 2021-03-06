import { Client, Collection, Guild, GuildResolvable } from "discord.js"
import Player from "../../Classes/Player";
import { PlayerOptions } from "./Player";

export interface ClientSettings {
    Player: PlayerOptions;
};

export interface ClientInterface {

    client: Client;
    players: Collection<GuildResolvable, Player>;
    settings: ClientSettings;
    createPlayer: (guild: Guild, opts?: PlayerOptions) => Player;
    
}