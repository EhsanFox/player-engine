import { Client as DjsClient, Collection, Guild, GuildResolvable } from "discord.js";
import { ClientInterface, ClientSettings } from "../typings/Classes/Client";
import { PlayerOptions } from "../typings/Classes/Player";
import { Errors } from "../utils/Enums";
import PlayerError from "../utils/PlayerError";
import Player from "./Player";
import * as Engines from "music-engines";

export default class Client implements ClientInterface {
    
    public client: DjsClient<boolean>;
    readonly players: Collection<GuildResolvable, Player> = new Collection();
    public settings: ClientSettings = {
        Player: {
            engine: "YouTube",
            leaveOnEnd: true,
            selfDeaf: true,
            selfMute: false,
        }
    };

    constructor(client: DjsClient)
    {
        this.client = client;
    }

    createPlayer(guild: Guild, opts: PlayerOptions = this.settings.Player): Player {

        if(this.players.has(guild.id))
            return this.players.get(guild.id);

        const result = new Player(guild, opts);
        this.players.set(guild.id, result);
        return result;
    }
}