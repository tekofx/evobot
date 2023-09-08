import youtube, { Playlist as YoutubePlaylist } from "youtube-sr";
import { config } from "../utils/config";
import { Song } from "./Song";
import SpotifyWebApi from "spotify-web-api-node";

const pattern = /^.*(youtu.be\/|list=)([^#\&\?]*).*/i;

export class Playlist {
  public data: YoutubePlaylist;
  public videos: Song[];

  public constructor(playlist: YoutubePlaylist) {
    this.data = playlist;

    this.videos = this.data.videos
      .filter((video) => video.title != "Private video" && video.title != "Deleted video")
      .slice(0, config.MAX_PLAYLIST_SIZE - 1)
      .map((video) => {
        return new Song({
          query: video.title!,
          title: video.title!,
          url: `https://youtube.com/watch?v=${video.id}`,
          duration: video.duration / 1000
        });
      });
  }

  public static async from(url: string = "", search: string = "") {
    const urlValid = pattern.test(url);
    let playlist;

    if (urlValid) {
      playlist = await youtube.getPlaylist(url);
    } else {
      const result = await youtube.searchOne(search, "playlist");

      playlist = await youtube.getPlaylist(result.url!);
    }

    return new this(playlist);
  }

  public static async fromSpotify(spotifyUrl: string) {
    const spotifyApi = new SpotifyWebApi({
      clientId: config.SPOTIFY_CLIENT_ID,
      clientSecret: config.SPOTIFY_CLIENT_SECRET
    });

    // Retrieve an access token
    const data = await spotifyApi.clientCredentialsGrant();
    spotifyApi.setAccessToken(data.body["access_token"]);

    // Get the playlist ID from the URL
    const playlistId = spotifyUrl.split("/playlist/")[1].split("?")[0];

    // Get the Spotify playlist
    const playlistResponse = await spotifyApi.getPlaylist(playlistId);
    const playlistName = playlistResponse.body.name;

    // Get the tracks in the Spotify playlist
    const tracksResponse = await spotifyApi.getPlaylistTracks(playlistId);
    const tracks = tracksResponse.body.items
      .filter((item) => item.track !== null)
      .map((item) => item.track!.name + " " + item.track!.artists[0].name);

    // Search for each track on YouTube and add it to a new YouTube playlist
    const youtubePlaylist = new YoutubePlaylist();
    youtubePlaylist.title = playlistName;
    for (const track of tracks) {
      const result = await youtube.searchOne(track);
      youtubePlaylist.videos.push(result);
    }

    return new this(youtubePlaylist);
  }
}
