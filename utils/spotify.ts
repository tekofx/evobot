import SpotifyWebApi from "spotify-web-api-node";
import { config } from "../utils/config";
import youtube, { Playlist as YoutubePlaylist } from "youtube-sr";
import { Playlist } from "../structs/Playlist";
import { Song } from "../structs/Song";

class Spotify {
  public SpotifyAPI: SpotifyWebApi;

  public constructor() {
    this.SpotifyAPI = new SpotifyWebApi({
      clientId: config.SPOTIFY_CLIENT_ID,
      clientSecret: config.SPOTIFY_CLIENT_SECRET
    });
    this.setAccessToken();
  }

  public async setAccessToken() {
    // Retrieve an access token
    const data = await this.SpotifyAPI.clientCredentialsGrant();
    this.SpotifyAPI.setAccessToken(data.body["access_token"]);
  }

  public async getTrack(spotifyUrl: string) {
    const trackId = spotifyUrl.split("/track/")[1];

    const songResponse = await this.SpotifyAPI.getTrack(trackId);
    const songName = songResponse.body.name;
    const songArtists = songResponse.body.artists;
    const songDuration = songResponse.body.duration_ms;

    const songYT = await youtube.searchOne(songArtists + " " + songName);

    return new Song({
      url: songYT.url,
      title: songName,
      query: spotifyUrl,
      duration: songDuration
    });
  }

  public async getPlaylist(spotifyUrl: string) {
    // Get the playlist ID from the URL
    const playlistId = spotifyUrl.split("/playlist/")[1].split("?")[0];

    // Get the Spotify playlist
    const playlistResponse = await this.SpotifyAPI.getPlaylist(playlistId);
    const playlistName = playlistResponse.body.name;

    // Get the tracks in the Spotify playlist
    const tracksResponse = await this.SpotifyAPI.getPlaylistTracks(playlistId);
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

    return new Playlist(youtubePlaylist);
  }
}
const spotify = new Spotify();

export { spotify };
